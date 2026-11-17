import React from 'react';

interface GenerateMartPasswordModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onPasswordGenerated?: (newPassword: string) => void;
}

export const GenerateMartPasswordModal: React.FC<GenerateMartPasswordModalProps> = () => {
  return null;
};
