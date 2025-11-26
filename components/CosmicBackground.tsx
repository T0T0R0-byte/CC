"use client";

import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";

const CosmicBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animationFrameId: number;
        let stars: { x: number; y: number; size: number; speed: number; opacity: number }[] = [];
        let shootingStars: { x: number; y: number; length: number; speed: number; opacity: number }[] = [];

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initStars();
        };

        const initStars = () => {
            stars = [];
            const numStars = Math.floor((canvas.width * canvas.height) / 2000); // Density
            for (let i = 0; i < numStars; i++) {
                stars.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: Math.random() * 2,
                    speed: Math.random() * 0.2,
                    opacity: Math.random(),
                });
            }
        };

        const drawStars = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw static stars
            stars.forEach((star) => {
                ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                ctx.fill();

                // Twinkle
                star.opacity += (Math.random() - 0.5) * 0.05;
                if (star.opacity < 0.1) star.opacity = 0.1;
                if (star.opacity > 1) star.opacity = 1;

                // Move slightly
                star.y -= star.speed;
                if (star.y < 0) star.y = canvas.height;
            });

            // Manage Shooting Stars
            if (Math.random() < 0.02) { // Chance to spawn
                shootingStars.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height / 2,
                    length: Math.random() * 80 + 20,
                    speed: Math.random() * 10 + 5,
                    opacity: 1
                });
            }

            // Draw Shooting Stars
            shootingStars.forEach((star, index) => {
                ctx.strokeStyle = `rgba(255, 255, 255, ${star.opacity})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(star.x, star.y);
                ctx.lineTo(star.x - star.length, star.y + star.length); // Diagonal down-left
                ctx.stroke();

                star.x -= star.speed;
                star.y += star.speed;
                star.opacity -= 0.02;

                if (star.opacity <= 0) {
                    shootingStars.splice(index, 1);
                }
            });

            animationFrameId = requestAnimationFrame(drawStars);
        };

        window.addEventListener("resize", resizeCanvas);
        resizeCanvas();
        drawStars();

        return () => {
            window.removeEventListener("resize", resizeCanvas);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <div className="fixed inset-0 z-[-1] overflow-hidden bg-[#050814]">
            {/* Canvas for Stars */}
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

            {/* Nebula / Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/10 to-black pointer-events-none" />

            {/* Floating UFO / Elements */}
            <motion.div
                animate={{
                    y: [0, -20, 0],
                    x: [0, 10, 0],
                    rotate: [0, 5, -5, 0]
                }}
                transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="absolute top-20 right-20 w-32 h-32 opacity-80 pointer-events-none hidden md:block"
            >
                {/* Simple CSS UFO */}
                <div className="relative w-full h-full">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-8 bg-gray-300 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.5)] z-10"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[80%] w-12 h-12 bg-sky-400/50 rounded-full blur-sm z-0"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-1 bg-sky-500/50 blur-md"></div>
                </div>
            </motion.div>

            <motion.div
                animate={{
                    y: [0, 30, 0],
                    x: [0, -20, 0],
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="absolute bottom-40 left-20 w-40 h-40 opacity-30 pointer-events-none blur-3xl bg-purple-600 rounded-full"
            />
        </div>
    );
};

export default CosmicBackground;
