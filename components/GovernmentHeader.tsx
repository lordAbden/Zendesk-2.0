'use client'

import Image from 'next/image'

export default function GovernmentHeader() {
    return (
        <div className="w-full bg-white border-b border-gray-300 shadow-sm">
            {/* Top border line */}
            <div className="h-0.5 bg-gray-600"></div>

            {/* Main header content */}
            <div className="flex items-center justify-between px-6 py-4">
                {/* Left Section - Logo */}
                <div className="flex items-center space-x-4">
                    <div className="relative h-20 w-20 flex-shrink-0">
                        <Image
                            src="/LOGOMA.jpeg"
                            alt="Logo DGM"
                            fill
                            className="object-contain"
                            sizes="80px"
                        />
                    </div>
                    <div className="text-blue-600">
                        <div className="text-2xl font-bold">DGM</div>
                        <div className="text-sm font-medium">Support Informatique</div>
                    </div>
                </div>

                {/* Center Section - Ministry Info */}
                <div className="flex flex-col items-center text-center">
                    <div className="text-sm font-medium text-gray-700 uppercase tracking-wide">
                        Ministère de l'Équipement et de l'Eau
                    </div>
                    <div className="text-lg font-bold text-blue-600 uppercase tracking-wide mt-1">
                        Direction Générale de la Météorologie
                    </div>
                </div>

                {/* Right Section - National Emblem */}
                <div className="flex items-center space-x-4">
                    <div className="relative h-32 w-32 flex-shrink-0">
                        <Image
                            src="/preloader.jpeg"
                            alt="Emblème National"
                            fill
                            className="object-contain"
                            sizes="128px"
                        />
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-gray-600 font-medium">
                            المملكة المغربية
                        </div>
                        <div className="text-xs text-gray-600 font-medium">
                            ⵜⴰⴳⵍⴷⵉⵜ ⵏ ⵍⵎⵖⵔⵉⴱ
                        </div>
                        <div className="text-sm font-bold text-blue-600">
                            Royaume du Maroc
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
