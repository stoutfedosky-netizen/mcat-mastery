import "../styles/globals.css";

export const metadata = {
  title: "The 528 Academy — MCAT Practice Tests with Expert Explanations",
  description: "AAMC-style MCAT practice questions with detailed explanations for every answer choice.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
