import { useState, useRef, useEffect } from 'react';

export default function RichTextEditor({ onSend, placeholder = 'Message #general' }) {
  const [content, setContent] = useState('');
  const [showToolbar, setShowToolbar] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const editorRef = useRef(null);
  const toolbarRef = useRef(null);

  const emojis = ['😀', '😂', '😍', '🤔', '😎', '🔥', '❤️', '👍', '👎', '🎉', '🎮', '💯', '✨', '💪', '👀', '🙏', '💀', '🤖', '🎵', '📸'];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target)) {
        setShowToolbar(false);
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (content.trim()) {
        onSend(content);
        setContent('');
      }
    }
  };

  const insertFormatting = (format) => {
    const textarea = editorRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const before = content.substring(0, start);
    const after = content.substring(end);

    let newText;
    switch (format) {
      case 'bold':
        newText = `${before}**${selectedText || 'bold text'}**${after}`;
        break;
      case 'italic':
        newText = `${before}*${selectedText || 'italic text'}*${after}`;
        break;
      case 'underline':
        newText = `${before}__${selectedText || 'underline'}__${after}`;
        break;
      case 'strikethrough':
        newText = `${before}~~${selectedText || 'strikethrough'}~~${after}`;
        break;
      case 'code':
        newText = `${before}\`${selectedText || 'code'}\`${after}`;
        break;
      case 'codeblock':
        newText = `${before}\`\`\`\n${selectedText || 'code block'}\n\`\`\`${after}`;
        break;
      case 'quote':
        newText = `${before}> ${selectedText || 'quote'}${after}`;
        break;
      case 'spoiler':
        newText = `${before}||${selectedText || 'spoiler'}||${after}`;
        break;
      case 'h1':
        newText = `${before}# ${selectedText || 'heading'}${after}`;
        break;
      case 'h2':
        newText = `${before}## ${selectedText || 'heading'}${after}`;
        break;
      case 'h3':
        newText = `${before}### ${selectedText || 'heading'}${after}`;
        break;
      case 'list':
        newText = `${before}\n- ${selectedText || 'list item'}${after}`;
        break;
      case 'numberedlist':
        newText = `${before}\n1. ${selectedText || 'list item'}${after}`;
        break;
      default:
        return;
    }

    setContent(newText);
    textarea.focus();
  };

  const insertEmoji = (emoji) => {
    const textarea = editorRef.current;
    const start = textarea.selectionStart;
    const before = content.substring(0, start);
    const after = content.substring(start);
    setContent(`${before}${emoji}${after}`);
    setShowEmojiPicker(false);
    textarea.focus();
  };

  const handleFileUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*,.pdf,.doc,.docx,.txt,.zip';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        // Handle file upload
        console.log('File selected:', file);
        // TODO: Implement file upload
      }
    };
    input.click();
  };

  return (
    <div className="relative">
      {/* Toolbar */}
      {showToolbar && (
        <div 
          ref={toolbarRef}
          className="absolute bottom-full left-0 right-0 mb-2 bg-discord-lighter rounded-lg shadow-xl p-2 flex flex-wrap gap-1 z-50"
        >
          <button
            onClick={() => insertFormatting('bold')}
            className="p-2 hover:bg-discord-light rounded text-discord-text font-bold"
            title="Bold (Ctrl+B)"
          >
            B
          </button>
          <button
            onClick={() => insertFormatting('italic')}
            className="p-2 hover:bg-discord-light rounded text-discord-text italic"
            title="Italic (Ctrl+I)"
          >
            I
          </button>
          <button
            onClick={() => insertFormatting('underline')}
            className="p-2 hover:bg-discord-light rounded text-discord-text underline"
            title="Underline (Ctrl+U)"
          >
            U
          </button>
          <button
            onClick={() => insertFormatting('strikethrough')}
            className="p-2 hover:bg-discord-light rounded text-discord-text line-through"
            title="Strikethrough"
          >
            S
          </button>
          <div className="w-px bg-discord-light mx-1" />
          <button
            onClick={() => insertFormatting('code')}
            className="p-2 hover:bg-discord-light rounded text-discord-text font-mono text-sm"
            title="Inline code"
          >
            {'</>'}
          </button>
          <button
            onClick={() => insertFormatting('codeblock')}
            className="p-2 hover:bg-discord-light rounded text-discord-text font-mono text-sm"
            title="Code block"
          >
            {'{ }'}
          </button>
          <div className="w-px bg-discord-light mx-1" />
          <button
            onClick={() => insertFormatting('quote')}
            className="p-2 hover:bg-discord-light rounded text-discord-text"
            title="Quote"
          >
            "
          </button>
          <button
            onClick={() => insertFormatting('spoiler')}
            className="p-2 hover:bg-discord-light rounded text-discord-text"
            title="Spoiler"
          >
            👁️
          </button>
          <div className="w-px bg-discord-light mx-1" />
          <button
            onClick={() => insertFormatting('h1')}
            className="p-2 hover:bg-discord-light rounded text-discord-text font-bold"
            title="Heading 1"
          >
            H1
          </button>
          <button
            onClick={() => insertFormatting('h2')}
            className="p-2 hover:bg-discord-light rounded text-discord-text font-bold"
            title="Heading 2"
          >
            H2
          </button>
          <button
            onClick={() => insertFormatting('h3')}
            className="p-2 hover:bg-discord-light rounded text-discord-text font-bold"
            title="Heading 3"
          >
            H3
          </button>
          <div className="w-px bg-discord-light mx-1" />
          <button
            onClick={() => insertFormatting('list')}
            className="p-2 hover:bg-discord-light rounded text-discord-text"
            title="Bullet list"
          >
            •
          </button>
          <button
            onClick={() => insertFormatting('numberedlist')}
            className="p-2 hover:bg-discord-light rounded text-discord-text"
            title="Numbered list"
          >
            1.
          </button>
          <div className="w-px bg-discord-light mx-1" />
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 hover:bg-discord-light rounded text-discord-text"
            title="Emoji"
          >
            😀
          </button>
          <button
            onClick={handleFileUpload}
            className="p-2 hover:bg-discord-light rounded text-discord-text"
            title="Attach file"
          >
            📎
          </button>
        </div>
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div 
          ref={toolbarRef}
          className="absolute bottom-full left-0 mb-2 bg-discord-lighter rounded-lg shadow-xl p-3 z-50 w-64"
        >
          <div className="grid grid-cols-8 gap-1">
            {emojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => insertEmoji(emoji)}
                className="text-2xl hover:bg-discord-light rounded p-1 transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Editor */}
      <div className="bg-discord-darker rounded-lg flex items-end">
        <button
          onClick={() => setShowToolbar(!showToolbar)}
          className="p-3 text-discord-muted hover:text-discord-text transition-colors"
          title="Formatting"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>

        <textarea
          ref={editorRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowToolbar(false)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-discord-text placeholder-discord-muted p-3 resize-none outline-none min-h-[60px] max-h-[200px]"
          rows={1}
          style={{ height: 'auto' }}
          onInput={(e) => {
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
        />

        <button
          onClick={() => handleFileUpload()}
          className="p-3 text-discord-muted hover:text-discord-text transition-colors"
          title="Attach file"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>

        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-3 text-discord-muted hover:text-discord-text transition-colors"
          title="Add emoji"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        <button
          onClick={() => {
            if (content.trim()) {
              onSend(content);
              setContent('');
            }
          }}
          disabled={!content.trim()}
          className="p-3 text-discord-muted hover:text-discord-accent transition-colors disabled:opacity-30 disabled:hover:text-discord-muted"
          title="Send"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
