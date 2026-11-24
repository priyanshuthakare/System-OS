export const HABITS = ['Scrolling', 'Smoking', 'Drinking alcohol', 'Adult content', 'Gaming', 'Impulse spending', 'Avoidance']
export const OTHER_HABIT = 'Something else'

export function resetActions(habit) {
    switch (habit?.trim().toLowerCase()) {
        case 'smoking': return ['Step away from the smoking spot', 'Give your hands something else to do']
        case 'drinking alcohol': return ['Pause and check your plan', 'Contact someone you trust']
        case 'porn':
        case 'adult content':
        case 'scrolling':
        case 'gaming': return ['Put the screen aside for a moment', 'Choose an activity away from the screen']
        case 'impulse spending': return ['Leave the item in your basket', 'Add it to a list to revisit tomorrow']
        default: return ['Pause and notice what prompted you', 'Choose one small thing to do next']
    }
}
