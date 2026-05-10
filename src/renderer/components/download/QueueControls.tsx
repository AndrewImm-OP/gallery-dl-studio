import React from 'react';
import { Trash2, PauseCircle, PlayCircle } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import type { QueueStatus } from '@shared/types';
import './QueueControls.css';

interface QueueControlsProps {
  status: QueueStatus;
  onPauseAll: () => void;
  onResumeAll: () => void;
  onClearCompleted: () => void;
}

export const QueueControls: React.FC<QueueControlsProps> = ({
  status,
  onPauseAll,
  onResumeAll,
  onClearCompleted,
}) => {
  const totalTasks = status.active + status.pending + status.completed + status.failed + status.paused;

  return (
    <div className="queue-controls">
      {/* Status badges */}
      <div className="queue-controls__status">
        <span className="queue-controls__title">Queue</span>
        {totalTasks > 0 && (
          <div className="queue-controls__badges">
            {status.active > 0 && (
              <Badge variant="info" dot>
                {status.active} active
              </Badge>
            )}
            {status.pending > 0 && (
              <Badge variant="default">
                {status.pending} pending
              </Badge>
            )}
            {status.completed > 0 && (
              <Badge variant="success">
                {status.completed} done
              </Badge>
            )}
            {status.failed > 0 && (
              <Badge variant="error">
                {status.failed} failed
              </Badge>
            )}
            {status.paused > 0 && (
              <Badge variant="warning">
                {status.paused} paused
              </Badge>
            )}
          </div>
        )}
        {totalTasks === 0 && (
          <span className="queue-controls__empty">No downloads</span>
        )}
      </div>

      {/* Action buttons */}
      <div className="queue-controls__actions">
        {status.active > 0 && (
          <Button
            variant="ghost"
            size="sm"
            icon={<PauseCircle size={14} />}
            onClick={onPauseAll}
          >
            Pause All
          </Button>
        )}
        {status.paused > 0 && (
          <Button
            variant="ghost"
            size="sm"
            icon={<PlayCircle size={14} />}
            onClick={onResumeAll}
          >
            Resume All
          </Button>
        )}
        {status.completed > 0 && (
          <Button
            variant="ghost"
            size="sm"
            icon={<Trash2 size={14} />}
            onClick={onClearCompleted}
          >
            Clear Completed
          </Button>
        )}
      </div>
    </div>
  );
};
