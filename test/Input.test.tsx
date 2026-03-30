import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Input } from '@/components/ui/Input';

describe('Input component', () => {
  it('renders correctly with default props', () => {
    render(<Input placeholder="Enter username" />);
    const inputElement = screen.getByPlaceholderText('Enter username');
    expect(inputElement).toBeInTheDocument();
  });

  it('renders label correctly', () => {
    render(<Input label="Username" id="username" />);
    const labelElement = screen.getByText('Username');
    expect(labelElement).toBeInTheDocument();
  });

  it('renders error message and adds error class', () => {
    render(<Input error="This field is required" />);
    const errorElement = screen.getByText('This field is required');
    expect(errorElement).toBeInTheDocument();
    
    // Using string matching for class names due to custom CSS-in-JS or global styles
    const inputs = document.querySelectorAll('input');
    expect(inputs[0].className).toContain('input-error');
  });

  it('handles onChange events', () => {
    const handleChange = vi.fn();
    render(<Input placeholder="Type here" onChange={handleChange} />);
    
    const inputElement = screen.getByPlaceholderText('Type here');
    fireEvent.change(inputElement, { target: { value: 'test' } });
    
    expect(handleChange).toHaveBeenCalledTimes(1);
    expect((inputElement as HTMLInputElement).value).toBe('test');
  });

  it('can be disabled', () => {
    render(<Input disabled placeholder="Disabled input" />);
    const inputElement = screen.getByPlaceholderText('Disabled input');
    expect(inputElement).toBeDisabled();
  });
});
