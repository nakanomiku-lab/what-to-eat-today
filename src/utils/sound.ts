
export const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(10); // Short, crisp vibration
    }
};
