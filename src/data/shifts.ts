import { Shift } from '../types';

export const shifts: Shift[] = [
  {
    id: 'call-9-18',
    name: 'Call 9:00-18:00',
    startTime: '09:00',
    endTime: '18:00',
    type: 'call',
    requiredAgents: 3,
  },
  {
    id: 'call-11-20',
    name: 'Call 11:00-20:00',
    startTime: '11:00',
    endTime: '20:00',
    type: 'call',
    requiredAgents: 1,
  },
  {
    id: 'call-12-21',
    name: 'Call 12:00-21:00',
    startTime: '12:00',
    endTime: '21:00',
    type: 'call',
    requiredAgents: 1,
  },
  {
    id: 'messaging-9-18',
    name: 'Messaging 9:00-18:00',
    startTime: '09:00',
    endTime: '18:00',
    type: 'messaging',
    requiredAgents: 0, // Dynamic - remaining available agents
  },
  {
    id: 'comments-9-18',
    name: 'Comments 9:00-18:00',
    startTime: '09:00',
    endTime: '18:00',
    type: 'comments',
    requiredAgents: 1,
  },
];