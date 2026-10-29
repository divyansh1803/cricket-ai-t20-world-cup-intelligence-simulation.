export type AnimationEventPriority =
  | 'VICTORY'
  | 'MATCH_RESULT'
  | 'CENTURY'
  | 'WICKET'
  | 'SIX'
  | 'FOUR'
  | 'MILESTONE'
  | 'COMMENTARY'
  | 'UI';

const ANIMATION_PRIORITY_SCORES: Record<AnimationEventPriority, number> = {
  VICTORY: 9,
  MATCH_RESULT: 8,
  CENTURY: 7,
  WICKET: 6,
  SIX: 5,
  FOUR: 4,
  MILESTONE: 3,
  COMMENTARY: 2,
  UI: 1,
};

export interface AnimationTask {
  id: string;
  priority: AnimationEventPriority;
  durationMs: number;
  onStart: () => void;
  onComplete?: () => void;
}

class CentralizedAnimationScheduler {
  private currentActiveTask: AnimationTask | null = null;
  private taskTimer: NodeJS.Timeout | null = null;
  private queue: AnimationTask[] = [];
  private isProcessing: boolean = false;
  private listeners: Set<(activeTask: AnimationTask | null) => void> = new Set();

  public subscribe(listener: (activeTask: AnimationTask | null) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l(this.currentActiveTask));
  }

  public schedule(task: AnimationTask): boolean {
    const taskScore = ANIMATION_PRIORITY_SCORES[task.priority];

    // If an active task is running
    if (this.currentActiveTask) {
      const activeScore = ANIMATION_PRIORITY_SCORES[this.currentActiveTask.priority];

      // If incoming task has strictly higher priority (e.g. VICTORY interrupts FOUR)
      if (taskScore > activeScore) {
        if (this.taskTimer) clearTimeout(this.taskTimer);
        this.currentActiveTask.onComplete?.();
        this.currentActiveTask = null;
      } else {
        // Drop lower priority task or duplicate celebration
        return false;
      }
    }

    this.runTask(task);
    return true;
  }

  private runTask(task: AnimationTask) {
    this.currentActiveTask = task;
    this.notify();

    try {
      task.onStart();
    } catch {
      // safe guard
    }

    this.taskTimer = setTimeout(() => {
      try {
        task.onComplete?.();
      } catch {
        // safe guard
      }
      this.currentActiveTask = null;
      this.notify();
    }, task.durationMs);
  }

  public getCurrentPriority(): AnimationEventPriority | null {
    return this.currentActiveTask?.priority || null;
  }

  public isBusy(): boolean {
    return this.currentActiveTask !== null;
  }

  public clearAll() {
    if (this.taskTimer) clearTimeout(this.taskTimer);
    this.currentActiveTask?.onComplete?.();
    this.currentActiveTask = null;
    this.queue = [];
    this.notify();
  }
}

export const animationScheduler = new CentralizedAnimationScheduler();
