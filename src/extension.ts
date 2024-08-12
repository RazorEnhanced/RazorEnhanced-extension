import * as vscode from 'vscode';
import * as protobuf from 'protobufjs';
import * as net from 'net';

let openFileProto: protobuf.Type;
let server: net.Server | undefined; // Server declared at module level
let sockets: net.Socket[] = []; // To track connected sockets

export function activate(context: vscode.ExtensionContext) {
    console.log('RazorEnhanced extension is now active!');

    let startReceiver = vscode.commands.registerCommand('razorenhanced.startReceiver', () => {
        startProtobufReceiver();
    });

    let stopReceiver = vscode.commands.registerCommand('razorenhanced.stopReceiver', () => {
        stopProtobufReceiver();
    });

    context.subscriptions.push(startReceiver);
    context.subscriptions.push(stopReceiver);
}

async function startProtobufReceiver() {
    // Load the proto file
    const root = await protobuf.load(__dirname + '/../proto/open_file.proto');
    openFileProto = root.lookupType('OpenFileCommand');

    // Start a TCP server
    const server = net.createServer((socket) => {
        socket.on('data', (data) => {
            try {
                const message = openFileProto.decode(data);
                handleOpenFileCommand(message);
            } catch (error) {
                console.error('Error decoding protobuf message:', error);
            }
        });
    });

    server.listen(8888, () => {
        console.log('RazorEnhanced Protobuf receiver listening on port 8888');
        vscode.window.showInformationMessage('RazorEnhanced Protobuf receiver started on port 8888');
    });
}


async function stopProtobufReceiver() {
    if (server) {
        // Close all open sockets
        sockets.forEach(socket => socket.destroy());
        sockets = []; // Clear the socket list

        // Close the server
        server.close(() => {
            console.log('RazorEnhanced Protobuf receiver stopped');
            vscode.window.showInformationMessage('RazorEnhanced Protobuf receiver stopped');
        });

        server = undefined;
    } else {
        vscode.window.showInformationMessage('No receiver is running');
    }
}


function handleOpenFileCommand(command: any) {
    const filePath = command.filePath;
    vscode.workspace.openTextDocument(filePath).then((document) => {
        vscode.window.showTextDocument(document);
    }, (error) => {
        vscode.window.showErrorMessage(`Failed to open file: ${error}`);
    });
}

export function deactivate() {
    stopProtobufReceiver();
    console.log('RazorEnhanced extension is deactivated.');
}
