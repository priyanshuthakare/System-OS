import React from 'react'
import BottomNav from './BottomNav'

/**
 * @intent The main device wrapper and layout constraint
 * @param {object} props - React props
 * @param {React.ReactNode} props.children - Views to render inside
 */
export default function PhoneFrame({ children }) {
    return (
        <div className="w-full h-[100dvh] bg-black flex flex-col overflow-hidden relative">
            {/* Native OS Status Padding / Top Area */}
            <div className="h-[20px] bg-black relative shrink-0 z-50"></div>

            {/* Screen Body Area */}
            <div className="flex-1 overflow-hidden flex flex-col relative">
                {children}
            </div>

            {/* Global Navigation Component */}
            <BottomNav />
        </div>
    )
}
