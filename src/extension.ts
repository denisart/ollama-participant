import * as vscode from 'vscode';
import ollama from 'ollama';

const PARTICIPANT_ID = 'ollama-participant';

const MODEL_SETTING_FIELD_NAME = 'model';

const DEFAULT_MODEL_NAME = 'qwen2.5-coder';

const getModelName = (): string => {
	const modelName = vscode.workspace.getConfiguration(PARTICIPANT_ID).get(MODEL_SETTING_FIELD_NAME);
	
	if (modelName) {
		return modelName as string;
	}
	return DEFAULT_MODEL_NAME;
};

const register_chat_participant = (context: vscode.ExtensionContext) => {
	const chat_handler: vscode.ChatRequestHandler = async (
		request: vscode.ChatRequest,
		context: vscode.ChatContext, 
		stream: vscode.ChatResponseStream, 
		_token: vscode.CancellationToken
	) => {
		const messages = [];

		for (const m of context.history) {
            if (m instanceof vscode.ChatRequestTurn) {
                messages.push({
					role: 'user', 
					content: m.prompt,
				});
            } else if (m instanceof vscode.ChatResponseTurn) {
                messages.push({
					role: 'assistant',
					content: Array.from(m.response.values()).map(value => value.value).join('\n'),
				});
            }
        }

		messages.push({
			role: 'user', 
			content: request.prompt,
		});

		try {
			const ollamaResponse = await ollama.chat({
				model: getModelName(),
				messages: messages, 
				stream: true 
			});

			for await (const part of ollamaResponse) {
				stream.markdown(part.message.content);
			}
		} catch(e) {
			const error_message = (e as Error).message; 
			vscode.window.showErrorMessage(`${PARTICIPANT_ID}: ${error_message}`);
		}
	};

	const tutor = vscode.chat.createChatParticipant(PARTICIPANT_ID, chat_handler);

	tutor.iconPath = vscode.Uri.joinPath(context.extensionUri, 'assets', 'img', 'ollama-64x64.png');
};

export function activate(context: vscode.ExtensionContext) {
	register_chat_participant(context);
}

export function deactivate() {}
