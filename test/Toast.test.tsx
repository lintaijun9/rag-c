import React, { useEffect } from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ToastProvider, useToast } from '@/components/ui/Toast';

// Component for testing the Toast Context
function TestComponent({ action, message }: { action: 'success' | 'error' | 'info' | 'warn', message: string }) {
  const toast = useToast();

  useEffect(() => {
    toast[action](message, 1000); // Set low duration for quick testing
  }, [action, message]);

  return <div>Test Component</div>;
}

describe('Toast System', () => {

  it('renders a success toast correctly', () => {
    render(
      <ToastProvider>
        <TestComponent action="success" message="File uploaded successfully" />
      </ToastProvider>
    );
    expect(screen.getByText('File uploaded successfully')).toBeInTheDocument();
  });

  it('renders an error toast correctly', () => {
    render(
      <ToastProvider>
        <TestComponent action="error" message="Upload failed" />
      </ToastProvider>
    );
    expect(screen.getByText('Upload failed')).toBeInTheDocument();
  });

  it('can be manually dismissed by clicking close button', async () => {
    render(
      <ToastProvider>
        <TestComponent action="info" message="Pending..." />
      </ToastProvider>
    );
    
    expect(screen.getByText('Pending...')).toBeInTheDocument();
    
    const closeBtn = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeBtn);
    
    // After closing via click, the message should be removed
    expect(screen.queryByText('Pending...')).not.toBeInTheDocument();
  });

  it('auto-dismisses after the specified duration', async () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <TestComponent action="warn" message="Warning message" />
      </ToastProvider>
    );
    
    expect(screen.getByText('Warning message')).toBeInTheDocument();
    
    // Advance timers by the duration (1000ms as per our test setup)
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    
    expect(screen.queryByText('Warning message')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

});
