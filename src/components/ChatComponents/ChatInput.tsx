import { ListPromptModal } from "@/components/ListPromptModal";
import { NoteTitleModal } from "@/components/NoteTitleModal";
import { CustomPromptProcessor } from "@/customPromptProcessor";
import { CopilotSettings } from "@/settings/SettingsPage";
import { IconPlayerStopFilled, IconSend } from "@tabler/icons-react";
import { App, TFile } from "obsidian";
import React, { useEffect, useRef, useState } from "react";

interface ChatInputProps {
  inputMessage: string;
  setInputMessage: (message: string) => void;
  handleSendMessage: () => void;
  isGenerating: boolean;
  chatIsVisible: boolean;
  onStopGenerating: () => void;
  app: App;
  settings: CopilotSettings;
  navigateHistory: (direction: "up" | "down") => string;
}

const ChatInput: React.FC<ChatInputProps> = ({
  inputMessage,
  setInputMessage,
  handleSendMessage,
  isGenerating,
  onStopGenerating,
  app,
  settings,
  navigateHistory,
  chatIsVisible,
}) => {
  const [rows, setRows] = useState(1);
  const [shouldFocus, setShouldFocus] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [tempInput, setTempInput] = useState("");
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [charactersPerRow, setCharactersPerRow] = useState(40);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleInputChange = async (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const inputValue = event.target.value;
    setInputMessage(inputValue);
    updateRows(inputValue);

    if (inputValue.slice(-2) === "[[") {
      showNoteTitleModal();
    } else if (inputValue === "/") {
      showCustomPromptModal();
    }
  };

  const showNoteTitleModal = () => {
    const fetchNoteTitles = async () => {
      const noteTitles = app.vault.getMarkdownFiles().map((file: TFile) => file.basename);

      new NoteTitleModal(app, noteTitles, (noteTitle: string) => {
        setInputMessage(inputMessage.slice(0, -2) + ` [[${noteTitle}]]`);
      }).open();
    };

    fetchNoteTitles();
  };

  const showCustomPromptModal = async () => {
    const customPromptProcessor = CustomPromptProcessor.getInstance(app.vault, settings);
    const prompts = await customPromptProcessor.getAllPrompts();
    const promptTitles = prompts.map((prompt) => prompt.title);

    new ListPromptModal(app, promptTitles, async (promptTitle: string) => {
      const selectedPrompt = prompts.find((prompt) => prompt.title === promptTitle);
      if (selectedPrompt) {
        await customPromptProcessor.recordPromptUsage(selectedPrompt.title);
        setInputMessage(selectedPrompt.content);
        updateRows(selectedPrompt.content);
      }
    }).open();
  };

  const updateRows = (text: string) => {
    const lineHeight = 20;
    const maxHeight = 200;
    const minRows = 1;
    const characterRows = Math.ceil(text.length / charactersPerRow);

    const newlineRows = text.split("\n").length;
    const rowsNeeded = Math.min(
      Math.max(newlineRows, characterRows, minRows),
      Math.floor(maxHeight / lineHeight)
    );
    setRows(rowsNeeded);
  };

  useEffect(() => {
    setShouldFocus(chatIsVisible);
  }, [chatIsVisible]);

  useEffect(() => {
    if (textAreaRef.current && shouldFocus) {
      textAreaRef.current.focus();
    }
  }, [shouldFocus]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;

    const textarea = textAreaRef.current;
    if (!textarea) return;

    const { selectionStart, value } = textarea;
    const lines = value.split("\n");
    const currentLineIndex = value.substring(0, selectionStart).split("\n").length - 1;

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
      setHistoryIndex(-1);
      setTempInput("");
    } else if (e.key === "ArrowUp") {
      if (currentLineIndex > 0 || selectionStart > 0) {
        // Allow normal cursor movement within multi-line input
        return;
      }
      e.preventDefault();
      if (historyIndex === -1 && value.trim() !== "") {
        setTempInput(value);
      }
      const newMessage = navigateHistory("up");
      if (newMessage !== inputMessage) {
        setHistoryIndex(historyIndex + 1);
        setInputMessage(newMessage);
        updateRows(newMessage);
        // Set cursor to beginning of input after update
        setTimeout(() => {
          if (textarea) {
            textarea.selectionStart = textarea.selectionEnd = 0;
          }
        }, 0);
      }
    } else if (e.key === "ArrowDown") {
      if (currentLineIndex < lines.length - 1 || selectionStart < value.length) {
        // Allow normal cursor movement within multi-line input
        return;
      }
      e.preventDefault();
      if (historyIndex > -1) {
        const newMessage = navigateHistory("down");
        setHistoryIndex(historyIndex - 1);
        if (historyIndex === 0) {
          setInputMessage(tempInput);
          updateRows(tempInput);
        } else {
          setInputMessage(newMessage);
          updateRows(newMessage);
        }
        // Set cursor to beginning of input after update
        setTimeout(() => {
          if (textarea) {
            textarea.selectionStart = textarea.selectionEnd = 0;
          }
        }, 0);
      }
    }
  };

  useEffect(() => {
    const calculateCharactersPerRow = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const fontSize = parseFloat(getComputedStyle(containerRef.current).fontSize);
        const averageCharWidth = fontSize * 0.6; // Approximate average character width
        const newCharactersPerRow = Math.floor(containerWidth / averageCharWidth);
        setCharactersPerRow(newCharactersPerRow);
      }
    };

    calculateCharactersPerRow();
    window.addEventListener("resize", calculateCharactersPerRow);

    return () => {
      window.removeEventListener("resize", calculateCharactersPerRow);
    };
  }, []);

  return (
    <div className="chat-input-container" ref={containerRef}>
      <textarea
        ref={textAreaRef}
        className="chat-input-textarea"
        placeholder="Ask anything. [[ for notes. / for custom prompts."
        value={inputMessage}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        rows={rows}
      />
      <button
        onClick={isGenerating ? onStopGenerating : handleSendMessage}
        aria-label={isGenerating ? "Stop generating" : "Send message"}
      >
        {isGenerating ? <IconPlayerStopFilled size={18} /> : <IconSend size={18} />}
      </button>
    </div>
  );
};

export default ChatInput;
