import { useCallback, useEffect, useState } from "react";
import { FormattedDateTime } from "./utils";
import { TFile } from "obsidian";

export interface ChatMessage {
  message: string;
  originalMessage?: string;
  sender: string;
  timestamp: FormattedDateTime | null;
  isVisible: boolean;
  sources?: { title: string; score: number }[];
  content?: any[];
  context?: {
    notes: TFile[];
    urls: string[];
  };
  isErrorMessage?: boolean;
}

class SharedState {
  chatHistory: ChatMessage[] = [];

  addMessage(message: ChatMessage): void {
    this.chatHistory.push(message);
  }

  getMessages(): ChatMessage[] {
    return this.chatHistory;
  }

  clearChatHistory(): void {
    this.chatHistory = [];
  }
}

export function useSharedState(
  sharedState: SharedState
): [ChatMessage[], (message: ChatMessage) => void, () => void] {
  // Initializes the local chatHistory state with the current
  // sharedState chatHistory using the useState hook
  // setChatHistory is used to update the *local* state
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(sharedState.getMessages());

  // The useEffect hook ensures that the local state is synchronized
  // with the shared state when the component is mounted.
  // [] is the dependency array. The effect will only run if one of
  // the dependencies has changed since the last render.
  // When there are no dependencies, the effect will only run once,
  // *right after the initial render* (similar to componentDidMount in class components).
  useEffect(() => {
    setChatHistory(sharedState.getMessages());
  }, [sharedState]);

  const addMessage = useCallback(
    (message: ChatMessage) => {
      sharedState.addMessage(message);
      setChatHistory([...sharedState.getMessages()]);
    },
    [sharedState]
  );

  const clearMessages = useCallback(() => {
    sharedState.clearChatHistory();
    setChatHistory([]);
  }, [sharedState]);

  return [chatHistory, addMessage, clearMessages];
}

export default SharedState;
