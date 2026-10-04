"use client";
import React from "react";
import { motion } from "motion/react";

export const TestimonialsColumn = (props) => {
  return (
    <div className={props.className}>
      <motion.div
        animate={{
          translateY: "-50%",
        }}
        transition={{
          duration: props.duration || 10,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop",
        }}
        className="flex flex-col gap-6 pb-6 bg-background"
      >
        {[
          ...new Array(2).fill(0).map((_, index) => (
            <React.Fragment key={index}>
              {props.testimonials.map(({ text, image, name, role }, i) => (
                <div className="p-8 sm:p-10 rounded-3xl border-2 border-ink dark:border-white/10 bg-white dark:bg-[#1C1C1C] shadow-[3px_3px_0px_#121212] dark:shadow-[3px_3px_0px_#222] max-w-xs w-full" key={i}>
                  <div className="text-xs sm:text-sm font-semibold leading-relaxed text-ink dark:text-stone-200">
                    "{text}"
                  </div>
                  <div className="flex items-center gap-3 mt-5 pt-3 border-t border-ink/10 dark:border-white/10">
                    <img
                      width={40}
                      height={40}
                      src={image}
                      alt={name}
                      className="h-10 w-10 rounded-full object-cover border-2 border-ink dark:border-white/20"
                    />
                    <div className="flex flex-col">
                      <div className="font-black text-xs text-ink dark:text-white tracking-tight leading-4">
                        {name}
                      </div>
                      <div className="text-[11px] font-medium text-stone-500 dark:text-stone-400 tracking-tight leading-4">
                        {role}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </React.Fragment>
          )),
        ]}
      </motion.div>
    </div>
  );
};

export default TestimonialsColumn;
