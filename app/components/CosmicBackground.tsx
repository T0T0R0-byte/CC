"use client";

import { useEffect, useRef } from "react";

export default function CosmicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const stars = Array.from({ length: 120 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.5,
      speed: Math.random() * 0.3 + 0.1,
    }));

    const shootingStars: { x: number; y: number; len: number; speed: number }[] = [];

    function draw() {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "rgba(5,8,20,0.5)";
      ctx.fillRect(0, 0, width, height);

      // Stars
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      stars.forEach((s) => {
        s.y += s.speed;
        if (s.y > height) s.y = 0;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Shooting stars
      shootingStars.forEach((star, i) => {
        ctx.strokeStyle = "rgba(186,230,253,0.8)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(star.x, star.y)
        ctx.lineTo(star.x + star.len, star.y + star.len / 3);
        ctx.stroke();

        star.x += star.speed;
        star.y += star.speed / 3;
        if (star.x > width || star.y > height) shootingStars.splice(i, 1);
      });

      // Randomly create shooting stars
      if (Math.random() < 0.005) {
        shootingStars.push({
          x: Math.random() * width * 0.8,
          y: Math.random() * height * 0.5,
          len: Math.random() * 120 + 50,
          speed: Math.random() * 6 + 4,
        });
      }

      requestAnimationFrame(draw);
    }

    draw();

    window.addEventListener("resize", () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-0 opacity-90 pointer-events-none"
      />
      {/* soft glowing color blobs */}
      <div className="fixed top-[-200px] left-[-200px] w-[500px] h-[500px] bg-sky-500/25 rounded-full blur-[180px] animate-slow-pulse"></div>
      <div className="fixed bottom-[-250px] right-[-250px] w-[600px] h-[600px] bg-indigo-600/25 rounded-full blur-[200px] animate-slow-pulse delay-700"></div>
    </>
  );
}
