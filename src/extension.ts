import * as vscode from 'vscode';
import * as protobuf from 'protobufjs';
import * as net from 'net';

let openFileProto: protobuf.Type;

export function activate(context: vscode.ExtensionContext) {
    console.log('RazorEnhanced extension is now active!');

    let disposable = vscode.commands.registerCommand('razorenhanced.startReceiver', () => {
        startProtobufReceiver();
    });

    context.subscriptions.push(disposable);
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

function handleOpenFileCommand(command: any) {
    const filePath = command.filePath;
    vscode.workspace.openTextDocument(filePath).then((document) => {
        vscode.window.showTextDocument(document);
    }, (error) => {
        vscode.window.showErrorMessage(`Failed to open file: ${error}`);
    });
}

export function deactivate() {}
