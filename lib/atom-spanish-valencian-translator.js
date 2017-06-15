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
            })
        );
    },

    deactivate() {
        this.subscriptions.dispose();
    },

    config: {
        markUnknown: {
            title: 'Mark unknown words',
            description:
                'If active will mark with a star(*) the words that could not be translated',
            type: 'boolean',
            default: true,
        },
    },

    translateText({
        text = '',
        fromLanguage = 'spa',
        toLanguage = 'cat_valencia',
        markUnknown = true,
    }) {
        return new Promise((resolve, reject) => {
            if (text.trim() === '') {
                return reject({
                    status: 'warning',
                    message: 'Must select a text to translate',
                });
            }

            const url =
                'https://www.apertium.org/apy/translate' +
                `?langpair=${fromLanguage}|${toLanguage}` +
                `&markUnknown=${markUnknown ? 'yes' : 'no'}` +
                `&q=${encodeURIComponent(text)}`;

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
                        return reject({
                            status: 'error',
                            message: `Unable to get translation from ${text}`,
                        });
                    }

                    resolve(translatedText);
                });
        });
    },

    translate(fromLanguage, toLanguage) {
        const editor = atom.workspace.getActiveTextEditor();

        if (!editor) {
            return atom.notifications.addWarning(
                'Must select a text to translate'
            );
        }

        const markUnknown =
            atom.config.get('atom-spanish-valencian-translator.markUnknown') ||
            false;

        const selections = editor.getSelections();

        Promise.all(
            selections.map(selection =>
                this.translateText({
                    text: selection.getText(),
                    fromLanguage,
                    toLanguage,
                    markUnknown,
                })
            )
        )
            .then(translatedTextSelections =>
                selections.forEach((selection, index) => {
                    selection.insertText(translatedTextSelections[index]);
                })
            )
            .catch(err => {
                if (err.status === 'warning') {
                    atom.notifications.addWarning(err.message);
                } else if (err.status === 'error') {
                    atom.notifications.addError(err.message);
                } else {
                    atom.notifications.addError(
                        err || 'Oops.. thats an error for sure'
                    );
                }
            });
    },
};
