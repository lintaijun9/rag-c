import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { RagAiTab } from '../src/components/rag/RagAiTab';
import React from 'react';

// Mock the UI components used inside RagAiTab to isolate testing
vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, disabled, className }: any) => (
    <button onClick={onClick} disabled={disabled} className={className} data-testid="mock-button">
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({
    error: vi.fn(),
    success: vi.fn(),
  }),
}));

vi.mock('streamdown', () => ({
  Streamdown: ({ children }: any) => <div data-testid="streamdown-mock">{children}</div>,
}));

describe('RagAiTab Component', () => {
  const defaultProps = {
    storeId: 'test-store',
    filter: {
      keyword: '',
      speaker: '',
      topic: '',
      startDateFrom: '',
      startDateTo: '',
      tags: [],
      status: '',
    },
    showError: vi.fn(),
    aiQuestion: '',
    setAiQuestion: vi.fn(),
  };

  it('renders correctly out of the box with welcome preset questions', () => {
    render(<RagAiTab {...defaultProps} />);
    
    // Check if the welcome title appears
    expect(screen.getByText('有什么我可以帮您的？')).toBeInTheDocument();
    
    // Check if quick questions appear
    expect(screen.getByText('提取最近的会议纪要')).toBeInTheDocument();
    
    // Suggestion box updates parent state
    fireEvent.click(screen.getByText('提取最近的会议纪要'));
    expect(defaultProps.setAiQuestion).toHaveBeenCalledWith('提取最近的会议纪要');
  });

  it('allows user typing and submittal', async () => {
    const user = userEvent.setup();
    render(<RagAiTab {...defaultProps} aiQuestion="What is the current status?" />);
    
    const input = screen.getByPlaceholderText('询问关于库中数据的细节...') as HTMLTextAreaElement;
    expect(input.value).toBe('What is the current status?');

    // Mocks fetch behavior for the API response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => {
          let done = false;
          return {
            read: () => {
              if (done) return Promise.resolve({ done: true });
              done = true;
              return Promise.resolve({
                done: false,
                value: new TextEncoder().encode('Everything is ok'),
              });
            },
          };
        },
      },
    });

    const sendBtn = screen.getByText('↑发送');
    fireEvent.click(sendBtn);

    // After clicking send, we expect fetch to be called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/rag/query', expect.any(Object));
      // AI response bubble should be recorded and rendered using streamdown mock
      expect(screen.getByText('Everything is ok')).toBeInTheDocument();
    });
  });
});
