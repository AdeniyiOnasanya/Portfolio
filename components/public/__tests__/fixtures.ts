import type { AiPractice, Experience, Footer, Person, Projects, Skills } from '../../../lib/schema';

export const samplePerson: Person = {
  name: 'Ada Lovelace',
  nameAccent: 'Lovelace',
  role: 'Software Engineer',
  location: 'London, United Kingdom',
  phone: '07000 000000',
  email: 'ada@example.com',
  cvUrl: '/cv/ada.pdf',
  cvDocxUrl: '/cv/ada.docx',
  github: 'https://github.com/example',
  linkedin: 'https://www.linkedin.com/in/example',
  yearsExp: 6,
  statement: 'A short statement that fits in one paragraph.',
  longBio: ['Paragraph one.', 'Paragraph two.'],
};

export const sampleSkills: Skills = [
  { label: 'Languages', items: ['TypeScript', 'PHP'] },
  { label: 'Frameworks', items: ['React', 'Laravel'] },
];

export const sampleExperience: Experience = [
  {
    role: 'Software Engineer',
    company: 'Acme',
    where: 'London',
    when: '2024, Present',
    desc: 'Building things that work.',
    tags: ['TypeScript', 'React'],
  },
];

export const sampleAiPractice: AiPractice = {
  eyebrow: 'AI-Assisted Development',
  headline: 'I ship faster, and better, with <em>AI in the loop</em>.',
  intro: 'A short intro paragraph about practice.',
  pillars: [{ n: 'i.', title: 'Specification first.', body: 'Spec everything.' }],
  workflow: [{ k: 'Spec', v: 'Plain-English intent.' }],
};

export const sampleProjects: Projects = ['project-one', 'project-two', 'project-three'];

export const sampleFooter: Footer = {
  heading: 'Let us talk.',
  copy: 'Open to roles.',
  availability: 'Available now',
  copyright: '(c) 2026 Ada Lovelace.',
};
