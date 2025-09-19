'use client'

import React, { useState } from 'react'

interface AppleDonutChartProps {
    data: Array<{
        label: string
        value: number
        color: string
    }>
    title: string
    total: number
    totalLabel: string
    size?: number
    strokeWidth?: number
}

export default function AppleDonutChart({
    data,
    title,
    total,
    totalLabel,
    size = 160,
    strokeWidth = 12
}: AppleDonutChartProps) {
    const radius = (size - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI

    // Hover state management
    const [hoveredSegment, setHoveredSegment] = useState<number | null>(null)

    // Calculate cumulative values for positioning
    const totalValue = data.reduce((sum, item) => sum + item.value, 0)
    let cumulativePercentage = 0

    // Debug: Log the data (remove in production)
    // console.log('AppleDonutChart data:', data)
    // console.log('AppleDonutChart total:', total)
    // console.log('AppleDonutChart hoveredSegment:', hoveredSegment)

    return (
        <div className="flex flex-col items-center space-y-3">
            {/* Title */}
            <h3 className="text-sm font-semibold text-gray-700 text-center">{title}</h3>

            {/* Debug info */}
            <div className="text-xs text-red-500 font-bold">
                DEBUG: Hovered = {hoveredSegment}, Data = {data.length} items
            </div>

            {/* Chart Container */}
            <div
                className="relative"
                style={{ width: size, height: size }}
            >
                <svg
                    width={size}
                    height={size}
                    className="transform -rotate-90"
                >
                    {/* Background circle */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke="rgba(0, 0, 0, 0.1)"
                        strokeWidth={strokeWidth + 2}
                        fill="none"
                    />

                    {/* Data segments */}
                    {data.map((item, index) => {
                        const percentage = (item.value / totalValue) * 100
                        const segmentLength = (percentage / 100) * circumference
                        const strokeDasharray = `${segmentLength} ${circumference}`

                        // Calculate offset based on current cumulative percentage
                        const strokeDashoffset = -cumulativePercentage * circumference / 100

                        // Update cumulative percentage for next segment
                        cumulativePercentage += percentage

                        return (
                            <circle
                                key={index}
                                cx={size / 2}
                                cy={size / 2}
                                r={radius}
                                stroke={item.color}
                                fill="none"
                                strokeDasharray={strokeDasharray}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                                className="transition-all duration-300 ease-in-out cursor-pointer"
                                style={{
                                    filter: `drop-shadow(0 2px 8px ${item.color}40)`,
                                    strokeWidth: hoveredSegment === index ? strokeWidth + 8 : strokeWidth,
                                    transform: hoveredSegment === index ? 'scale(1.2)' : 'scale(1)',
                                    opacity: hoveredSegment === index ? 1 : (hoveredSegment !== null ? 0.3 : 0.8)
                                }}
                                onMouseEnter={() => {
                                    console.log('Hovering segment:', index, 'Current hoveredSegment:', hoveredSegment)
                                    setHoveredSegment(index)
                                }}
                                onMouseLeave={() => {
                                    console.log('Leaving segment:', index)
                                    setHoveredSegment(null)
                                }}
                            />
                        )
                    })}
                </svg>

                {/* Central content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-2xl font-bold text-gray-800 transition-all duration-300 ease-in-out">
                        {hoveredSegment !== null ? data[hoveredSegment].value : total}
                    </div>
                    <div className="text-xs text-gray-600 text-center transition-all duration-300 ease-in-out">
                        {hoveredSegment !== null ? data[hoveredSegment].label : totalLabel}
                    </div>
                    {/* Debug indicator */}
                    {hoveredSegment !== null && (
                        <div className="text-xs text-blue-500 mt-1 font-bold">
                            HOVERING: {data[hoveredSegment].label} ({data[hoveredSegment].value})
                        </div>
                    )}
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-2">
                {data.map((item, index) => (
                    <div key={index} className="flex items-center space-x-1">
                        <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: item.color }}
                        />
                        <span className="text-xs text-gray-600">{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
