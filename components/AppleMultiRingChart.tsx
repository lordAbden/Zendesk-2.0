'use client'

import React, { useState } from 'react'

interface AppleMultiRingChartProps {
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

export default function AppleMultiRingChart({
    data,
    title,
    total,
    totalLabel,
    size = 200,
    strokeWidth = 12
}: AppleMultiRingChartProps) {
    const radius = (size - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI

    // Hover state management
    const [hoveredSegment, setHoveredSegment] = useState<number | null>(null)

    // Calculate cumulative values for positioning
    const totalValue = data.reduce((sum, item) => sum + item.value, 0)

    return (
        <div className="flex flex-col items-center space-y-4">
            {/* Title */}
            <h3 className="text-sm font-semibold text-gray-700 text-center">{title}</h3>

            {/* Debug info - removed for production */}

            {/* Chart Container */}
            <div
                className="relative overflow-visible"
                style={{ width: size, height: size }}
            >
                <svg
                    width={size}
                    height={size}
                    viewBox={`0 0 ${size} ${size}`}
                    className="transform -rotate-90 overflow-visible"
                    style={{ overflow: 'visible' }}
                >
                    {/* Filter definitions with expanded region */}
                    <defs>
                        <filter
                            id="glow"
                            filterUnits="userSpaceOnUse"
                            x={-size}
                            y={-size}
                            width={size * 3}
                            height={size * 3}
                        >
                            <feGaussianBlur stdDeviation="8" result="blur" />
                            <feColorMatrix
                                in="blur"
                                type="matrix"
                                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"
                                result="coloredBlur"
                            />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>
                    {/* Background circles */}
                    {data.map((item, index) => {
                        // Ensure circles are never completely filled (max 90% fill)
                        const maxPercentage = 90
                        const actualPercentage = Math.min((item.value / totalValue) * 100, maxPercentage)
                        const segmentLength = (actualPercentage / 100) * circumference
                        const strokeDasharray = `${segmentLength} ${circumference}`
                        const strokeDashoffset = 0

                        // Create concentric rings with different radii
                        const ringRadius = radius - (index * (strokeWidth + 4))
                        const centerX = size / 2
                        const centerY = size / 2

                        return (
                            <g key={index}>
                                {/* Background circle */}
                                <circle
                                    cx={centerX}
                                    cy={centerY}
                                    r={ringRadius}
                                    stroke="rgba(0, 0, 0, 0.1)"
                                    strokeWidth={strokeWidth}
                                    fill="none"
                                />

                                {/* Data segment */}
                                <circle
                                    cx={centerX}
                                    cy={centerY}
                                    r={ringRadius}
                                    stroke={item.color}
                                    strokeWidth={strokeWidth}
                                    fill="none"
                                    strokeDasharray={strokeDasharray}
                                    strokeDashoffset={strokeDashoffset}
                                    strokeLinecap="round"
                                    className="transition-all duration-300 ease-in-out"
                                    style={{
                                        filter: hoveredSegment === index
                                            ? `url(#glow) drop-shadow(0 0 20px ${item.color}) drop-shadow(0 0 40px ${item.color}80) drop-shadow(0 2px 8px ${item.color}40)`
                                            : `drop-shadow(0 2px 8px ${item.color}40)`,
                                        strokeWidth: hoveredSegment === index ? strokeWidth + 4 : strokeWidth,
                                        opacity: hoveredSegment === index ? 1 : (hoveredSegment !== null ? 0.3 : 0.8)
                                    }}
                                />
                            </g>
                        )
                    })}
                </svg>

                {/* Simple hover areas - just the ring areas */}
                {data.map((item, index) => {
                    const ringRadius = radius - (index * (strokeWidth + 4))
                    const centerX = size / 2
                    const centerY = size / 2

                    return (
                        <div
                            key={`hover-${index}`}
                            className="absolute cursor-pointer rounded-full"
                            style={{
                                left: centerX - ringRadius - 5,
                                top: centerY - ringRadius - 5,
                                width: (ringRadius + 5) * 2,
                                height: (ringRadius + 5) * 2,
                                backgroundColor: 'transparent',
                                pointerEvents: 'all',
                                zIndex: index + 1 // Outer rings have higher z-index
                            }}
                            onMouseEnter={() => setHoveredSegment(index)}
                            onMouseLeave={() => setHoveredSegment(null)}
                        />
                    )
                })}

                {/* Central content - positioned lower */}
                <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingTop: '10px' }}>
                    <div className="text-2xl font-bold text-gray-800 transition-all duration-300 ease-in-out">
                        {hoveredSegment !== null ? data[hoveredSegment].value : total}
                    </div>
                    <div className="text-xs text-gray-600 text-center transition-all duration-300 ease-in-out">
                        {hoveredSegment !== null ? data[hoveredSegment].label : totalLabel}
                    </div>
                    {/* Debug indicator - removed for production */}
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-col gap-2">
                {data.map((item, index) => (
                    <div key={index} className="flex items-center space-x-2">
                        <div
                            className="w-3 h-3 rounded-sm"
                            style={{ backgroundColor: item.color }}
                        />
                        <span className="text-xs text-gray-600">{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}