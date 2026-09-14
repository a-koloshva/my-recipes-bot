const sessions = new Map();

export function getSession(chatId) {
    if (!sessions.has(chatId)) {
        sessions.set(chatId, {
            addStep: undefined,
            pendingName: undefined,
            pendingDescription: undefined,
            selectCategory: undefined,
        });
    }
    return sessions.get(chatId);
}

export function resetSession(session) {
    session.addStep = undefined;
    session.pendingName = undefined;
    session.pendingDescription = undefined;
    session.selectCategory = undefined;
}
