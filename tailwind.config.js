module.exports = {
  content: [
    "./src/**/*.js",
    "./src/**/*.jsx",
    "./src/**/*.ts",
    "./src/**/*.tsx",
    "./public/index.html",
  ],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      animation: {
        "toast-enter": "toast-enter 200ms ease-out",
        "toast-leave": "toast-leave 150ms ease-in forwards",
      },
      keyframes: {
        "toast-enter": {
          "0%": { transform: "scale(0.9)", opacity: 0 },
          "100%": { transform: "scale(1)", opacity: 1 },
        },
        "toast-leave": {
          "0%": { transform: "scale(1)", opacity: 1 },
          "100%": { transform: "scale(0.9)", opacity: 0 },
        },
      },
    },
  },
  variants: {
    extend: {},
  },
};
