"use client";

import Link from "next/link";
import React from "react";
import { motion } from "framer-motion";

const HomePage: React.FC = () => {
  return (
    <div className="px-6 max-w-6xl mx-auto">

      {/* HERO */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center mt-10 md:mt-20"
      >
        <h1 className="text-5xl md:text-6xl font-extrabold leading-tight bg-gradient-to-r from-sky-400 via-blue-300 to-indigo-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(56,189,248,0.3)]">
          Discover Workshops<br />That Unlock Your Potential
        </h1>

        <p className="mt-6 text-gray-300 text-lg max-w-2xl mx-auto">
          Learn new skills, meet inspiring creators, and explore a universe of knowledge — all in one place.
        </p>

        <Link
          href="/workshops"
          className="inline-block mt-10 px-8 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-[0_0_20px_rgba(56,189,248,0.4)] hover:scale-105 transition-all"
        >
          Explore Workshops
        </Link>
      </motion.section>

      {/* FEATURES */}
      <section className="mt-32 grid md:grid-cols-3 gap-10">
        {[
          {
            title: "Find Workshops Easily",
            desc: "Search, filter, and discover events tailored for you.",
            icon: "fa-magnifying-glass",
          },
          {
            title: "Register Instantly",
            desc: "Book with one click and upload your payment receipt.",
            icon: "fa-ticket",
          },
          {
            title: "Vendor Friendly",
            desc: "Creators can host workshops and manage participants.",
            icon: "fa-users",
          },
        ].map((card, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.2, duration: 0.6 }}
            className="p-6 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_0_30px_rgba(56,189,248,0.15)] hover:-translate-y-1 transition-all"
          >
            <i className={`fa-solid ${card.icon} text-3xl text-sky-400`} />
            <h3 className="mt-4 text-xl font-semibold text-white">{card.title}</h3>
            <p className="mt-2 text-gray-400 text-sm">{card.desc}</p>
          </motion.div>
        ))}
      </section>

      {/* CTA */}
      <motion.section
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mt-32 text-center"
      >
        <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          Ready to explore something new?
        </h2>
        <p className="text-gray-400 mt-3">
          Browse workshops created by experts and start your journey today.
        </p>

        <Link
          href="/workshops"
          className="inline-block mt-6 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:scale-105 transition"
        >
          View All Workshops
        </Link>
      </motion.section>
    </div>
  );
};

export default HomePage;
