import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

// Safe DOM patch to prevent Google Translate / browser extensions from crashing React with NotFoundError removeChild
if (typeof Node === 'function' && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child.parentNode !== this) {
      if (console) {
        console.warn('Cannot remove a child from a different parent', child, this);
      }
      return child;
    }
    return originalRemoveChild.apply(this, arguments as any) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (console) {
        console.warn('Cannot insert before a reference node from a different parent', referenceNode, this);
      }
      return newNode;
    }
    return originalInsertBefore.apply(this, arguments as any) as T;
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
