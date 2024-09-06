const vscode = require('vscode');
const WebSocket = require('ws');

const PROTO_PATH = __dirname + '/ProtoControl.proto';

let client;
let ws = null;

// Enum values from ProtoMessageType in your .proto file
const ProtoMessageType = {
  PlayResponseType: 1,
  PlayRequestType: 2,
  StopPlayRequestType: 3,
  StopPlayResponseType: 4,
  RecordResponseType: 10,
  RecordRequestType: 11,
  StopRecordRequestType: 12,
  StopRecordResponseType: 13
};

// Function to connect to the WebSocket and return the instance
function connectWebSocket(wsUrl, onOpen, onMessage, onClose, onError) {
    console.log(`connect wsurl: ${wsUrl}`)    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
	vscode.window.showInformationMessage('WebSocket connection established.');
	if (onOpen) onOpen(ws);
    };
    
    ws.onmessage = (event) => {
	const response = JSON.parse(event.data);
	if (onMessage) onMessage(response);
    };
    
    ws.onclose = () => {
	vscode.window.showInformationMessage('WebSocket connection closed.');
	if (onClose) onClose();
    };
    
    ws.onerror = (error) => {
	vscode.window.showErrorMessage(`WebSocket error: ${error.message}`);
	if (onError) onError(error);
    };
    
    return ws;
}

function activate(context) {
    console.log("Beginning activation")
    
    // Function to send a message over WebSocket
    function sendWebSocketMessage(message) {
	if (ws && ws.readyState === WebSocket.OPEN) {
	    ws.send(JSON.stringify(message));
	} else {
	    vscode.window.showErrorMessage('WebSocket connection is not open.');
	}
    }

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
        const playRequest = {
	    type: 2, //ProtoMessageType.PlayRequestType,
	    language: language,
	    commands: text.split('\n')
	};
	// Retrieve the port number from the settings
	const config = vscode.workspace.getConfiguration('razorEnhanced');
	const port = config.get('serverPort', 15454); // Default to 15454 if not set	
	const wsUrl = `ws://localhost:${port}/proto`; // Dynamically constructed server address	
	console.log(`wsurl: ${wsUrl}`)

	const ws = connectWebSocket(
	    wsUrl,
	    (ws) => {
		ws.send(JSON.stringify(playRequest));
	    },
	    (response) => {
		if (response.type === ProtoMessageType.PlayResponseType) {
		    const buildResultWindow = vscode.window.createOutputChannel('Play Results');
		    buildResultWindow.show();
		    buildResultWindow.appendLine(response.result);
		    
		    if (!response.more) {
			ws.close();
		    }
		}
	    },
	    () => {
		// Optional: Cleanup or additional actions on close
	    },
	    (error) => {
		// Optional: Handle errors specifically
	    }
	);	
    });
	
    let recordCommand = vscode.commands.registerCommand('razorEnhanced.record', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor!');
            return;
        }
	try {
            const language = editor.document.languageId === 'python' ? 1 : 3; // 1 for PYTHON, 3 for UOSTEAM

	    // Start Recording
	    recording = true;
	    vscode.commands.executeCommand('setContext', 'razor-enhanced.record', 'Stop Recording');

	    const recordRequest = {
		type: ProtoMessageType.RecordRequestType,  // Use the numeric value for RecordRequestType
		language: language
	    };

	    // Retrieve the port number from the settings
	    const config = vscode.workspace.getConfiguration('razorEnhanced');
	    const port = config.get('serverPort', 15454); // Default to 15454 if not set	
	    const wsUrl = `ws://localhost:${port}/proto`; // Dynamically constructed server address	
	    console.log(`wsurl: ${wsUrl}`)
	    const ws = connectWebSocket(
		wsUrl,
		(ws) => {
		    ws.send(JSON.stringify(recordRequest));
		},
		(response) => {
		    if (response.type === ProtoMessageType.RecordResponseType) {
			editor.edit(editBuilder => {
			    editBuilder.insert(new vscode.Position(editor.document.lineCount, 0), response.data + '\n');
			});
			
			if (!response.more) {
			    ws.close();
			    recording = false;
			    vscode.commands.executeCommand('setContext', 'razor-enhanced.record', 'Record');
			}
		    }
		},
		() => {
		    // Optional: Cleanup or additional actions on close
		},
		(error) => {
		    // Optional: Handle errors specifically
		}
	    );
	} catch (error) {
            console.error("Error in record command:", error);
	}	
    });

    let stopRecordingCommand = vscode.commands.registerCommand('razorEnhanced.stopRecording', () => {
	// Stop Recording
	recording = false;
	vscode.commands.executeCommand('setContext', 'razor-enhanced.record', 'Record');
	
	const stopRecordRequest = {
            type: ProtoMessageType.StopRecordRequestType  // Use the numeric value for StopRecordRequestType
	};
	
	// Retrieve the port number from the settings
	const config = vscode.workspace.getConfiguration('razorEnhanced');
	const port = config.get('serverPort', 15454); // Default to 15454 if not set	
	const wsUrl = `ws://localhost:${port}/proto`; // Dynamically constructed server address	
	
	const ws = connectWebSocket(
	    wsUrl,
            (ws) => {
		ws.send(JSON.stringify(stopRecordRequest));
            },
            (response) => {
		if (response.type === ProtoMessageType.StopRecordResponseType) {
		    vscode.window.showInformationMessage('Recording stopped successfully');
		    ws.close();
		}
            },
            () => {
		// Optional: Cleanup or additional actions on close
            },
            (error) => {
		// Optional: Handle errors specifically
            }
	);							       
    });


    // Listen for changes in Python or .uos files
    vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document.languageId === 'python' || event.document.fileName.endsWith('.uos')) {
            // Your logic here for when a Python or .uos file is edited
            console.log(`Edited document: ${event.document.fileName}`);
        }
    });

    
    console.log("Registering functions")
    context.subscriptions.push(recordCommand)
    context.subscriptions.push(stopRecordingCommand)
    context.subscriptions.push(playCommand);
}

function deactivate() {
}

module.exports = {
    activate,
    deactivate
}
