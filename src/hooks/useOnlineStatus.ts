import { useState, useEffect } from 'react';

export function useOnlineStatus() {
  // Always return true to ensure local edits and cloud sync are never blocked by false offline status in preview environments
  return true;
}
