const vscode = require('vscode');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const PROTO_PATH = __dirname + '/ProtoControl.proto';

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);

const SERVER_ADDRESS = 'localhost:15454';
let client;
let recordStream;

function activate(context) {
    console.log("Beginning activation")
    client = new protoDescriptor.protocontrol.ProtoControl(SERVER_ADDRESS, grpc.credentials.createInsecure());
    console.log("client created")
    let recordCommand = vscode.commands.registerCommand('razorEnhanced.record', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor!');
            return;
        }

        const language = editor.document.languageId === 'python' ? 1 : 3; // 1 for PYTHON, 3 for UOSTEAM
        const request = { language };

        recordStream = client.Record(request);
        recordStream.on('data', (response) => {
            editor.edit(editBuilder => {
                const lastLine = editor.document.lineAt(editor.document.lineCount - 1);
                const position = new vscode.Position(lastLine.lineNumber, lastLine.text.length);
                editBuilder.insert(position, response.data + '\n');
            });
        });

        vscode.commands.executeCommand('setContext', 'razorEnhanced.isRecording', true);
    });

    let stopRecordingCommand = vscode.commands.registerCommand('razorEnhanced.stopRecording', () => {
        if (recordStream) {
            recordStream.cancel();
            recordStream = null;
        }
        vscode.commands.executeCommand('setContext', 'razorEnhanced.isRecording', false);
    });

    let playCommand = vscode.commands.registerCommand('razorEnhanced.play', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor!');
            return;
        }

        const document = editor.document;
        const text = document.getText();
        const commands = text.split('\n');

        const language = document.languageId === 'python' ? 1 : 3; // 1 for PYTHON, 3 for UOSTEAM
        const request = { language, commands };

        const outputChannel = vscode.window.createOutputChannel('RazorEnhanced Results');
        outputChannel.show();

        const playStream = client.Play(request);
        playStream.on('data', (response) => {
            outputChannel.appendLine(response.result);
            if (response.is_finished) {
                outputChannel.appendLine('Execution finished.');
            }
        });

        playStream.on('end', () => {
            outputChannel.appendLine('Stream closed.');
        });
    });
    console.log("Registering functions")
    context.subscriptions.push(recordCommand, stopRecordingCommand, playCommand);
}

function deactivate() {
    if (recordStream) {
        recordStream.cancel();
    }
}

module.exports = {
    activate,
    deactivate
}
