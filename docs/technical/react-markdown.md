# react-markdown

React component to render markdown.

## Contents

- [Install](#install)
- [Use](#use)
- [API](#api)
- [Examples](#examples)
- [Plugins](#plugins)

## What is this?

This package is a React component that can be given a string of markdown that it'll safely render to React elements. You can pass plugins to change how markdown is transformed and pass components that will be used instead of normal HTML elements.

## Install

```sh
npm install react-markdown
```

## Use

Basic usage:

```js
import Markdown from "react-markdown";

const markdown = "# Hi, *Pluto*!";

<Markdown>{markdown}</Markdown>;
```

With plugins:

```js
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

const markdown = `Just a link: www.nasa.gov.`;

<Markdown remarkPlugins={[remarkGfm]}>{markdown}</Markdown>;
```

## API

Key props:

- `children` — markdown string to render
- `remarkPlugins` — array of remark plugins
- `rehypePlugins` — array of rehype plugins
- `components` — object mapping HTML tags to React components
- `allowedElements` — array of allowed HTML tags
- `disallowedElements` — array of disallowed HTML tags

## Examples

### Using GitHub Flavored Markdown

```js
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

const markdown = `
* [x] todo
* [ ] done

| Column 1 | Column 2 |
|----------|----------|
| Cell 1   | Cell 2   |
`;

<Markdown remarkPlugins={[remarkGfm]}>{markdown}</Markdown>;
```

### Custom Components (Syntax Highlighting)

```js
import Markdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dark } from "react-syntax-highlighter/dist/esm/styles/prism";

const markdown = `
\`\`\`js
console.log('Hello, world!');
\`\`\`
`;

<Markdown
  components={{
    code(props) {
      const { children, className, ...rest } = props;
      const match = /language-(\w+)/.exec(className || "");
      return match ? (
        <SyntaxHighlighter
          {...rest}
          PreTag="div"
          children={String(children).replace(/\n$/, "")}
          language={match[1]}
          style={dark}
        />
      ) : (
        <code {...rest} className={className}>
          {children}
        </code>
      );
    },
  }}
>
  {markdown}
</Markdown>;
```

## Plugins

Common plugins:

- `remark-gfm` — GitHub Flavored Markdown (tables, task lists, strikethrough)
- `remark-math` — Math notation support
- `rehype-katex` — Render math with KaTeX
- `rehype-highlight` — Syntax highlighting
- `rehype-raw` — Allow raw HTML (use carefully for security)
