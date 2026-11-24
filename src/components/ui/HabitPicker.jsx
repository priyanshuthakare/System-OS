import { OTHER_HABIT } from '../../lib/habits'
import ChoiceField from './ChoiceField'

export default function HabitPicker({ choice, disabled }) {
    const options = [{value:'', label:'General reset'}, ...[...new Set([...choice.options, OTHER_HABIT])]
        .map(habit => ({value:habit, label:habit}))]
    return <div className="mb-4">
        <ChoiceField label="Habit on your mind" disabled={disabled} value={choice.selected}
            options={options} onChange={choice.setChoice} />
        {choice.selected === OTHER_HABIT && <input disabled={disabled} aria-label="Your habit" placeholder="Name your habit"
            className="block w-full bg-black border border-border p-2" maxLength={80} value={choice.custom} onChange={e=>choice.setCustom(e.target.value)} />}
    </div>
}
