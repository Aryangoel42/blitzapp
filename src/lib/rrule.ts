export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval?: number; // Every N days/weeks/months
  byDay?: number[]; // 0=Sunday, 1=Monday, etc.
  byMonthDay?: number[]; // Day of month (1-31)
  byMonth?: number[]; // Month (1-12)
  endDate?: Date;
  count?: number; // Number of occurrences
  startDate: Date;
}

export class RRuleParser {
  static parse(ruleString: string): RecurrenceRule | null {
    try {
      const parts = ruleString.split(';');
      const rule: Partial<RecurrenceRule> = {};
      
      for (const part of parts) {
        const [key, value] = part.split('=');
        
        switch (key) {
          case 'FREQ':
            if (['daily', 'weekly', 'monthly', 'yearly'].includes(value)) {
              rule.frequency = value as any;
            }
            break;
          case 'INTERVAL':
            rule.interval = parseInt(value) || 1;
            break;
          case 'BYDAY':
            rule.byDay = value.split(',').map(day => this.parseDay(day));
            break;
          case 'BYMONTHDAY':
            rule.byMonthDay = value.split(',').map(day => parseInt(day));
            break;
          case 'BYMONTH':
            rule.byMonth = value.split(',').map(month => parseInt(month));
            break;
          case 'UNTIL':
            rule.endDate = new Date(value);
            break;
          case 'COUNT':
            rule.count = parseInt(value);
            break;
          case 'DTSTART':
            rule.startDate = new Date(value);
            break;
        }
      }
      
      if (!rule.frequency || !rule.startDate) {
        return null;
      }
      
      return rule as RecurrenceRule;
    } catch (error) {
      console.error('Failed to parse RRULE:', error);
      return null;
    }
  }

  static generate(rule: RecurrenceRule, count: number = 10): Date[] {
    const dates: Date[] = [];
    let currentDate = new Date(rule.startDate);
    let occurrences = 0;
    
    while (occurrences < count && (!rule.endDate || currentDate <= rule.endDate)) {
      if (this.matchesRule(currentDate, rule)) {
        dates.push(new Date(currentDate));
        occurrences++;
      }
      
      currentDate = this.addInterval(currentDate, rule.frequency, rule.interval || 1);
    }
    
    return dates;
  }

  static nextOccurrence(rule: RecurrenceRule, fromDate: Date = new Date()): Date | null {
    let currentDate = new Date(fromDate);
    let attempts = 0;
    const maxAttempts = 1000; // Prevent infinite loops
    
    while (attempts < maxAttempts) {
      if (currentDate >= rule.startDate && this.matchesRule(currentDate, rule)) {
        return new Date(currentDate);
      }
      
      currentDate = this.addInterval(currentDate, rule.frequency, rule.interval || 1);
      attempts++;
    }
    
    return null;
  }

  static toString(rule: RecurrenceRule): string {
    const parts: string[] = [];
    
    parts.push(`FREQ=${rule.frequency.toUpperCase()}`);
    parts.push(`DTSTART=${rule.startDate.toISOString()}`);
    
    if (rule.interval && rule.interval > 1) {
      parts.push(`INTERVAL=${rule.interval}`);
    }
    
    if (rule.byDay && rule.byDay.length > 0) {
      const days = rule.byDay.map(day => this.formatDay(day)).join(',');
      parts.push(`BYDAY=${days}`);
    }
    
    if (rule.byMonthDay && rule.byMonthDay.length > 0) {
      const days = rule.byMonthDay.join(',');
      parts.push(`BYMONTHDAY=${days}`);
    }
    
    if (rule.byMonth && rule.byMonth.length > 0) {
      const months = rule.byMonth.join(',');
      parts.push(`BYMONTH=${months}`);
    }
    
    if (rule.endDate) {
      parts.push(`UNTIL=${rule.endDate.toISOString()}`);
    }
    
    if (rule.count) {
      parts.push(`COUNT=${rule.count}`);
    }
    
    return parts.join(';');
  }

  private static parseDay(day: string): number {
    const dayMap: { [key: string]: number } = {
      'SU': 0, 'MO': 1, 'TU': 2, 'WE': 3, 'TH': 4, 'FR': 5, 'SA': 6,
      'SUN': 0, 'MON': 1, 'TUE': 2, 'WED': 3, 'THU': 4, 'FRI': 5, 'SAT': 6
    };
    
    return dayMap[day.toUpperCase()] ?? 0;
  }

  private static formatDay(day: number): string {
    const days = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    return days[day] || 'SU';
  }

  private static matchesRule(date: Date, rule: RecurrenceRule): boolean {
    if (rule.byDay && rule.byDay.length > 0) {
      if (!rule.byDay.includes(date.getDay())) {
        return false;
      }
    }
    
    if (rule.byMonthDay && rule.byMonthDay.length > 0) {
      if (!rule.byMonthDay.includes(date.getDate())) {
        return false;
      }
    }
    
    if (rule.byMonth && rule.byMonth.length > 0) {
      if (!rule.byMonth.includes(date.getMonth() + 1)) {
        return false;
      }
    }
    
    return true;
  }

  private static addInterval(date: Date, frequency: string, interval: number): Date {
    const result = new Date(date);
    
    switch (frequency) {
      case 'daily':
        result.setDate(result.getDate() + interval);
        break;
      case 'weekly':
        result.setDate(result.getDate() + (interval * 7));
        break;
      case 'monthly':
        result.setMonth(result.getMonth() + interval);
        break;
      case 'yearly':
        result.setFullYear(result.getFullYear() + interval);
        break;
    }
    
    return result;
  }

  // Convenience methods for common patterns
  static daily(interval: number = 1, startDate: Date = new Date()): RecurrenceRule {
    return {
      frequency: 'daily',
      interval,
      startDate
    };
  }

  static weekly(interval: number = 1, byDay: number[] = [], startDate: Date = new Date()): RecurrenceRule {
    return {
      frequency: 'weekly',
      interval,
      byDay: byDay.length > 0 ? byDay : [startDate.getDay()],
      startDate
    };
  }

  static monthly(interval: number = 1, byMonthDay: number[] = [], startDate: Date = new Date()): RecurrenceRule {
    return {
      frequency: 'monthly',
      interval,
      byMonthDay: byMonthDay.length > 0 ? byMonthDay : [startDate.getDate()],
      startDate
    };
  }

  static yearly(interval: number = 1, byMonth: number[] = [], byMonthDay: number[] = [], startDate: Date = new Date()): RecurrenceRule {
    return {
      frequency: 'yearly',
      interval,
      byMonth: byMonth.length > 0 ? byMonth : [startDate.getMonth() + 1],
      byMonthDay: byMonthDay.length > 0 ? byMonthDay : [startDate.getDate()],
      startDate
    };
  }
}


