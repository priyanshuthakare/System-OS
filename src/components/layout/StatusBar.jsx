/**
 * @intent Top status UI showing simulated time/battery
 * @param None
 */
export default function StatusBar() {
    return (
        <div className="flex justify-between w-full px-[28px] bg-red font-mono text-[10px] text-text2 absolute top-[14px]">
            <span>9:41</span>
            <span>●●●</span>
        </div>
    )
}
