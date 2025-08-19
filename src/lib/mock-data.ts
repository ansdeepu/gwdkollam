import type { FileNode } from '@/lib/types';

export const mockFiles: FileNode[] = [
  {
    id: '1',
    name: 'src',
    type: 'directory',
    children: [
      {
        id: '2',
        name: 'app',
        type: 'directory',
        children: [
          {
            id: '3',
            name: 'page.tsx',
            type: 'file',
            extension: 'ts',
            content: `import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Welcome to the App</h1>
      <p className="mt-2 text-muted-foreground">
        This is a sample page. Click on files in the explorer to view and edit them.
      </p>
      <Button className="mt-4">Get Started</Button>
    </div>
  )
}`,
          },
          {
            id: '4',
            name: 'layout.tsx',
            type: 'file',
            extension: 'ts',
            content: `export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}`,
          },
        ],
      },
      {
        id: '5',
        name: 'components',
        type: 'directory',
        children: [
          {
            id: '6',
            name: 'button.tsx',
            type: 'file',
            extension: 'ts',
            content: `import * as React from "react"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, ...props }, ref) => {
    return (
      <button
        className={className}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
`,
          },
        ],
      },
      {
        id: '7',
        name: 'styles',
        type: 'directory',
        children: [
          {
            id: '8',
            name: 'globals.css',
            type: 'file',
            extension: 'css',
            content: `body {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}`,
          },
        ],
      },
      {
        id: '9',
        name: 'index.html',
        type: 'file',
        extension: 'html',
        content: `<!DOCTYPE html>
<html>
<head>
  <title>My App</title>
  <link rel="stylesheet" href="styles/globals.css">
</head>
<body>
  <div id="root"></div>
  <script src="app.js"></script>
</body>
</html>`,
      },
    ],
  },
  {
    id: '10',
    name: 'package.json',
    type: 'file',
    extension: 'json',
    content: `{
  "name": "gwd-kollam-19082025",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "next": "14.2.3"
  }
}`,
  },
  {
    id: '11',
    name: 'README.md',
    type: 'file',
    extension: 'md',
    content: `# GWD Kollam 19082025

This is a web-based file explorer and editor with AI-powered documentation generation.

## Features

- File & Directory Display
- Drag & Drop Upload
- Text Editor
- AI Documentation Generation
- File Search
- Error Handling
`,
  },
];
