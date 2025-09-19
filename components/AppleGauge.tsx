'use client'

import React, { useState, useEffect, useRef } from 'react'

interface AppleGaugeProps {
    value: number
    max?: number
    size?: number
    strokeWidth?: number
    color?: string
    backgroundColor?: string
    icon?: React.ReactNode
    label?: string
    showPercentage?: boolean
}

export default function AppleGauge({
    value,
    max = 100,
    size = 120,
    strokeWidth = 8,
    color = '#34D399',
    backgroundColor = '#E5E7EB',
    icon,
    label,
    showPercentage = true
}: AppleGaugeProps) {
    const [animatedValue, setAnimatedValue] = useState(0)
    const [isHovered, setIsHovered] = useState(false)
    const [isVisible, setIsVisible] = useState(false)
    const gaugeRef = useRef<HTMLDivElement>(null)

    const radius = (size - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    const percentage = Math.min((animatedValue / max) * 100, 100)
    const strokeDasharray = circumference
    const strokeDashoffset = circumference - (percentage / 100) * circumference

    // Intersection Observer for page load animation
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !isVisible) {
                    setIsVisible(true)
                    // Start animation after a small delay
                    setTimeout(() => {
                        setAnimatedValue(value)
                    }, 200)
                }
            },
            { threshold: 0.1 }
        )

        if (gaugeRef.current) {
            observer.observe(gaugeRef.current)
        }

        return () => {
            if (gaugeRef.current) {
                observer.unobserve(gaugeRef.current)
            }
        }
    }, [value, isVisible])

    // Hover animation effect
    useEffect(() => {
        if (isHovered) {
            // Slight scale up and enhanced glow on hover
            const timer = setTimeout(() => {
                // This will trigger the hover styles
            }, 50)
            return () => clearTimeout(timer)
        }
    }, [isHovered])

    return (
        <div
            ref={gaugeRef}
            className="flex flex-col items-center justify-center transition-all duration-300 ease-out"
            style={{
                transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                filter: isHovered ? 'drop-shadow(0 8px 25px rgba(52, 211, 153, 0.4))' : 'drop-shadow(0 2px 8px rgba(52, 211, 153, 0.2))'
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="relative overflow-visible" style={{ width: size, height: size }}>
                {/* Background Circle */}
                <svg
                    width={size}
                    height={size}
                    viewBox={`0 0 ${size} ${size}`}
                    className="transform -rotate-90 transition-all duration-500 ease-out overflow-visible"
                    style={{
                        overflow: 'visible',
                        filter: isHovered
                            ? 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15))'
                            : 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
                    }}
                >
                    {/* Filter definitions with expanded region */}
                    <defs>
                        <filter
                            id="gauge-glow"
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
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={backgroundColor}
                        strokeWidth={strokeWidth}
                        fill="none"
                        className={`transition-all duration-500 ease-out ${isHovered ? 'opacity-40' : 'opacity-30'}`}
                    />
                    {/* Progress Circle */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={color}
                        strokeWidth={strokeWidth}
                        fill="none"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                        style={{
                            filter: isHovered
                                ? `url(#gauge-glow) drop-shadow(0 0 20px ${color}) drop-shadow(0 0 40px ${color}80) drop-shadow(0 4px 16px rgba(52, 211, 153, 0.5))`
                                : `drop-shadow(0 2px 8px rgba(52, 211, 153, 0.3))`,
                            strokeWidth: isHovered ? strokeWidth + 1 : strokeWidth
                        }}
                    />
                </svg>

                {/* Center Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center transition-all duration-300 ease-out">
                    {showPercentage && (
                        <div
                            className="text-2xl font-semibold text-gray-800 mb-1 transition-all duration-500 ease-out"
                            style={{
                                transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                                color: isHovered ? '#1F2937' : '#374151'
                            }}
                        >
                            {Math.round(percentage)}%
                        </div>
                    )}
                    {icon && (
                        <div
                            className="text-gray-600 transition-all duration-300 ease-out"
                            style={{
                                transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                                color: isHovered ? '#4B5563' : '#6B7280'
                            }}
                        >
                            {icon}
                        </div>
                    )}
                </div>
            </div>

            {label && (
                <div
                    className="mt-3 text-sm font-medium text-gray-600 text-center transition-all duration-300 ease-out"
                    style={{
                        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                        color: isHovered ? '#4B5563' : '#6B7280'
                    }}
                >
                    {label}
                </div>
            )}
        </div>
    )
}
