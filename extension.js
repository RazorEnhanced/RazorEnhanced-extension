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

let client;
let recordStream;

function activate(context) {
    console.log("Beginning activation")
    let recordCommand = vscode.commands.registerCommand('razorEnhanced.record', () => {
	// Retrieve the port number from the settings
	const config = vscode.workspace.getConfiguration('razorEnhanced');
	const port = config.get('serverPort', 15454); // Default to 15454 if not set
	
	const SERVER_ADDRESS = `localhost:${port}`; // Dynamically constructed server address	
	client = new protoDescriptor.protocontrol.ProtoControl(SERVER_ADDRESS, grpc.credentials.createInsecure());
	console.log("client created")
	
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor!');
            return;
        }
	try {
            const language = editor.document.languageId === 'python' ? 1 : 3; // 1 for PYTHON, 3 for UOSTEAM
            const request = { language };

            vscode.commands.executeCommand('setContext', 'razorEnhanced.isRecording', true);
            recordStream = client.Record(request);
            recordStream.on('data', (response) => {
		editor.edit(editBuilder => {
                    const lastLine = editor.document.lineAt(editor.document.lineCount - 1);
                    const position = new vscode.Position(lastLine.lineNumber, lastLine.text.length);
                    editBuilder.insert(position, response.data + '\n');
		});
            });
	
	} catch (error) {
            console.error("Error in record command:", error);
	}	
    });

    let stopRecordingCommand = vscode.commands.registerCommand('razorEnhanced.stopRecording', () => {
	try {
            vscode.commands.executeCommand('setContext', 'razorEnhanced.isRecording', false);
            if (recordStream) {
		recordStream.cancel();
		recordStream = null;
            }
	} catch (error) {
            console.error("Error in stopRecording command:", error);
	}
	closeClient(client);
	
	function closeClient(client) {
	    if (client) {
	    grpc.closeClient(client); // This will properly close the client connection
	    client = false;
            }
	}
    });

    let playCommand = vscode.commands.registerCommand('razorEnhanced.play', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor!');
            return;
        }

	// Retrieve the port number from the settings
	const config = vscode.workspace.getConfiguration('razorEnhanced');
	const port = config.get('serverPort', 15454); // Default to 15454 if not set
	
	const SERVER_ADDRESS = `localhost:${port}`; // Dynamically constructed server address
	client = new protoDescriptor.protocontrol.ProtoControl(SERVER_ADDRESS, grpc.credentials.createInsecure());
	console.log("client created")

        const document = editor.document;
        const text = document.getText();
        const commands = text.split('\n');

        const language = document.languageId === 'python' ? 1 : 3; // 1 for PYTHON, 3 for UOSTEAM
        const request = { language, commands };
	try {
	    // Retrieve the port number from the settings
	    const config = vscode.workspace.getConfiguration('razorEnhanced');
	    const port = config.get('serverPort', 15454); // Default to 15454 if not set
	    
	    client = new protoDescriptor.protocontrol.ProtoControl(SERVER_ADDRESS, grpc.credentials.createInsecure());
	    console.log("client created")
	    
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
		closeClient(client);
            });
	} catch (error) {
            console.error("Error in play command:", error);
	}	    

	function closeClient(client) {
	    if (client) {
	    grpc.closeClient(client); // This will properly close the client connection
	    client = false;
            }
	}
	    
    });

    // Listen for changes in Python or .uos files
    vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document.languageId === 'python' || event.document.fileName.endsWith('.uos')) {
            // Your logic here for when a Python or .uos file is edited
            console.log(`Edited document: ${event.document.fileName}`);
        }
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
