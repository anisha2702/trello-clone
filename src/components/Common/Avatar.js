import React from 'react';

export default function Avatar({ member, size = 'md', showTooltip = true }) {
  if (!member) return null;
  const sizeClass = size === 'sm' ? 'avatar-sm' : size === 'lg' ? 'avatar-lg' : '';
  return (
    <div
      className={`avatar ${sizeClass}`}
      style={{ background: member.avatar_color || '#0079bf' }}
      title={showTooltip ? member.name : undefined}
    >
      {member.initials}
    </div>
  );
}
