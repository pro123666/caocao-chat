import type { CSSProperties } from 'react';
import ReactMarkdown from 'react-markdown';
import SyntaxHighlighter from 'react-syntax-highlighter/dist/esm/light';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import type { Components } from 'react-markdown';

/** 代码高亮主题，满足 react-syntax-highlighter 的 style 类型 */
const codeStyle = atomOneDark as unknown as { [key: string]: CSSProperties };

/** 语言别名，使常见写法能正确高亮 */
const LANGUAGE_ALIASES: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  tsx: 'tsx',
  jsx: 'javascript',
  py: 'python',
  sh: 'bash',
  zsh: 'bash',
  yml: 'yaml',
  md: 'markdown',
};

interface MarkdownMessageProps {
  content: string;
  className?: string;
}

export function MarkdownMessage({ content, className = '' }: MarkdownMessageProps) {
  const components: Components = {
    code({ node, className: codeClassName, children, ...props }) {
      const match = /language-(\w+)/.exec(codeClassName || '');
      const isInline = !match;
      if (isInline) {
        return (
          <code className={codeClassName} {...props}>
            {children}
          </code>
        );
      }
      const lang = (match[1] || '').toLowerCase();
      const language = LANGUAGE_ALIASES[lang] || lang || 'plaintext';
      const { style: _s, ...rest } = props as { style?: unknown; [k: string]: unknown };
      return (
        <SyntaxHighlighter
          style={codeStyle}
          language={language}
          PreTag="div"
          customStyle={{ margin: '0.5rem 0', borderRadius: '0.375rem', fontSize: '0.875rem' }}
          codeTagProps={{ style: { fontFamily: 'inherit' } }}
          {...rest}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      );
    },
  };

  return (
    <div className={`markdown-body text-sm leading-relaxed ${className}`}>
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
    </div>
  );
}
