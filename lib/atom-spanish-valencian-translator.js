'use babel';

import { CompositeDisposable } from 'atom';

export default {
    subscriptions: null,

    activate(state) {
        // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
        this.subscriptions = new CompositeDisposable();

        // Register command that toggles this view
        this.subscriptions.add(
            atom.commands.add('atom-workspace', {
                'atom-spanish-valencian-translator:spanish-valencian': () =>
                    this.translate('spa', 'cat_valencia'),
                'atom-spanish-valencian-translator:valencian-spanish': () =>
                    this.translate('cat', 'spa'),
            }),
        );
    },

    deactivate() {
        this.subscriptions.dispose();
    },

    config: {
        markUnknown: {
            title: 'Mark unknown words',
            description: 'If active will mark with a star(*) the words that could not be translated',
            type: 'boolean',
            default: false,
        },
    },

    translate(fromLanguage, toLanguage) {
        const editor = atom.workspace.getActiveTextEditor();
        const markUnknown =
            atom.config.get('atom-spanish-valencian-translator.markUnknown') ||
            false;

        if (!editor) {
            return atom.notifications.addWarning(
                'Must select a text to translate',
            );
        }

        const selectedText = editor.getSelectedText();

        if (selectedText.trim() === '') {
            return atom.notifications.addWarning(
                'Must select a text to translate',
            );
        }

        const url =
            'https://www.apertium.org/apy/translate' +
            `?langpair=${fromLanguage}|${toLanguage}` +
            `&markUnknown=${markUnknown ? 'yes' : 'no'}` +
            `&q=${encodeURIComponent(selectedText)}`;

        fetch(url, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
            },
        })
            .then(response => response.json())
            .then(data => {
                const translatedText =
                    data.responseData && data.responseData.translatedText;

                if (!translatedText) {
                    return atom.notifications.addError(
                        'Unable to get translated text',
                    );
                }

                editor.insertText(translatedText);
            })
            .catch(err =>
                atom.notifications.addError(
                    err || 'Oops.. thats an error for sure',
                ),
            );
    },
};
