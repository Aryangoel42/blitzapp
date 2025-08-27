export interface ParsedTask {
  title: string;
  dueDate?: Date;
  priority?: 'low' | 'medium' | 'high';
  tags: string[];
  estimateMinutes?: number;
  description?: string;
}

export class TaskParser {
  private static timePatterns = [
    // Tomorrow patterns
    { regex: /\btomorrow\b/i, handler: () => this.addDays(new Date(), 1) },
    { regex: /\btoday\b/i, handler: () => new Date() },
    { regex: /\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i, handler: (match: string) => this.getNextWeekday(match.split(' ')[1]) },
    
    // Time patterns
    { regex: /\b(\d{1,2}):?(\d{2})?\s*(am|pm)\b/i, handler: (match: string, fullText: string) => this.parseTime(match, fullText) },
    { regex: /\b(\d{1,2})\s*(am|pm)\b/i, handler: (match: string, fullText: string) => this.parseTime(match, fullText) },
    
    // Date patterns
    { regex: /\b(\d{1,2})\/(\d{1,2})\b/, handler: (match: string) => this.parseDate(match) },
    { regex: /\b(\d{1,2})-(\d{1,2})\b/, handler: (match: string) => this.parseDate(match) },
    
    // Relative patterns
    { regex: /\bin\s+(\d+)\s+(day|week|month)s?\b/i, handler: (match: string) => this.parseRelativeDate(match) }
  ];

  private static priorityPatterns = [
    { regex: /\b(urgent|asap|critical)\b/i, priority: 'high' as const },
    { regex: /\b(low|minor|unimportant)\b/i, priority: 'low' as const },
    { regex: /\b(medium|normal|standard)\b/i, priority: 'medium' as const }
  ];

  private static estimatePatterns = [
    { regex: /\b(\d+)\s*m\b/i, multiplier: 1 },
    { regex: /\b(\d+)\s*min\b/i, multiplier: 1 },
    { regex: /\b(\d+)\s*minute\b/i, multiplier: 1 },
    { regex: /\b(\d+)\s*h\b/i, multiplier: 60 },
    { regex: /\b(\d+)\s*hour\b/i, multiplier: 60 }
  ];

  static parse(input: string): ParsedTask {
    const originalInput = input.trim();
    let remainingInput = originalInput;
    
    const result: ParsedTask = {
      title: '',
      tags: [],
      priority: 'medium'
    };

    // Extract tags
    const tagMatches = remainingInput.match(/#[\w-]+/g);
    if (tagMatches) {
      result.tags = tagMatches.map(tag => tag.substring(1));
      remainingInput = remainingInput.replace(/#[\w-]+/g, '').trim();
    }

    // Extract priority
    for (const pattern of this.priorityPatterns) {
      const match = remainingInput.match(pattern.regex);
      if (match) {
        result.priority = pattern.priority;
        remainingInput = remainingInput.replace(pattern.regex, '').trim();
        break;
      }
    }

    // Extract estimate
    for (const pattern of this.estimatePatterns) {
      const match = remainingInput.match(pattern.regex);
      if (match) {
        result.estimateMinutes = parseInt(match[1]) * pattern.multiplier;
        remainingInput = remainingInput.replace(pattern.regex, '').trim();
        break;
      }
    }

    // Extract due date
    for (const pattern of this.timePatterns) {
      const match = remainingInput.match(pattern.regex);
      if (match) {
        const date = pattern.handler(match[0], remainingInput);
        if (date) {
          result.dueDate = date;
          remainingInput = remainingInput.replace(pattern.regex, '').trim();
          break;
        }
      }
    }

    // Clean up and set title
    result.title = remainingInput.replace(/\s+/g, ' ').trim();
    
    // If no title remains, use original input
    if (!result.title) {
      result.title = originalInput;
    }

    return result;
  }

  private static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private static getNextWeekday(weekday: string): Date {
    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDay = weekdays.indexOf(weekday.toLowerCase());
    const today = new Date();
    const currentDay = today.getDay();
    const daysToAdd = (targetDay - currentDay + 7) % 7;
    return this.addDays(today, daysToAdd);
  }

  private static parseTime(match: string, fullText: string): Date | null {
    const timeMatch = match.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
    if (!timeMatch) return null;

    const hour = parseInt(timeMatch[1]);
    const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const period = timeMatch[3].toLowerCase();

    let adjustedHour = hour;
    if (period === 'pm' && hour !== 12) adjustedHour += 12;
    if (period === 'am' && hour === 12) adjustedHour = 0;

    // Try to find a date context in the full text
    const date = this.extractDateContext(fullText);
    if (date) {
      date.setHours(adjustedHour, minute, 0, 0);
      return date;
    }

    // Default to today
    const today = new Date();
    today.setHours(adjustedHour, minute, 0, 0);
    return today;
  }

  private static parseDate(match: string): Date | null {
    const parts = match.split(/[\/-]/);
    if (parts.length !== 2) return null;

    const month = parseInt(parts[0]) - 1; // Month is 0-indexed
    const day = parseInt(parts[1]);
    const year = new Date().getFullYear();

    return new Date(year, month, day);
  }

  private static parseRelativeDate(match: string): Date | null {
    const parts = match.match(/(\d+)\s+(day|week|month)/i);
    if (!parts) return null;

    const amount = parseInt(parts[1]);
    const unit = parts[2].toLowerCase();
    const today = new Date();

    switch (unit) {
      case 'day':
        return this.addDays(today, amount);
      case 'week':
        return this.addDays(today, amount * 7);
      case 'month':
        const result = new Date(today);
        result.setMonth(result.getMonth() + amount);
        return result;
      default:
        return null;
    }
  }

  private static extractDateContext(text: string): Date | null {
    // Look for date context in the text
    if (text.includes('tomorrow')) {
      return this.addDays(new Date(), 1);
    }
    if (text.includes('today')) {
      return new Date();
    }
    return null;
  }
}
