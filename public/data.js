/* ============================================================
   MindArmor — static content (activities, reset kit, vault, crisis)
   Exposed on window.MA_DATA for app.js.
   ============================================================ */
window.MA_DATA = {
  // ---------------- Self-care activities ----------------
  activities: [
    { key: 'sleep',       label: 'Quality sleep',  emoji: '😴' },
    { key: 'exercise',    label: 'Exercise',       emoji: '🏃' },
    { key: 'mindfulness', label: 'Mindfulness',    emoji: '🧘' },
    { key: 'nutrition',   label: 'Ate well',       emoji: '🥗' },
    { key: 'social',      label: 'Connection',     emoji: '💬' },
    { key: 'outdoors',    label: 'Time outdoors',  emoji: '🌤️' },
    { key: 'journaling',  label: 'Journaling',     emoji: '📓' },
    { key: 'hydration',   label: 'Hydration',      emoji: '💧' },
  ],

  // ---------------- Reset Kit (grounding / breathing tools) ----------------
  // Card metadata only; the interactive logic lives in app.js.
  resetKit: [
    {
      key: 'box',
      icon: '🫁',
      title: 'Box Breathing',
      desc: 'Steady your nervous system with a 4-4-4-4 rhythm.',
    },
    {
      key: 'grounding',
      icon: '🖐️',
      title: '5-4-3-2-1 Grounding',
      desc: 'Anchor to the present using your five senses.',
    },
    {
      key: 'pmr',
      icon: '💪',
      title: 'Progressive Muscle Relaxation',
      desc: 'Release tension by tensing and relaxing muscle groups.',
    },
  ],

  // ---------------- Resources — education matrix ----------------
  vault: [
    {
      id: 'depression',
      icon: '🌧️',
      title: 'Clinical Depression',
      subtitle: 'Signs, symptoms & when to seek help',
      sections: [
        {
          heading: 'Emotional signs',
          list: [
            'Persistent sad, empty, or hopeless mood most of the day, nearly every day',
            'Loss of interest or pleasure in activities once enjoyed (anhedonia)',
            'Feelings of worthlessness, excessive or inappropriate guilt',
            'Irritability, restlessness, or frequent tearfulness',
          ],
        },
        {
          heading: 'Physical & cognitive signs',
          list: [
            'Changes in sleep — insomnia or sleeping far too much',
            'Significant appetite or weight changes',
            'Fatigue or loss of energy even after rest',
            'Trouble concentrating, remembering, or making decisions',
            'Unexplained aches, pains, or digestive problems',
          ],
        },
        {
          heading: 'When it may be clinical',
          text:
            'Symptoms that last two weeks or longer, occur most of the day, and interfere with work, ' +
            'relationships, or daily life may indicate a major depressive episode. Depression is a ' +
            'medical condition — not a weakness or a choice — and it is highly treatable.',
        },
        {
          tip:
            'A first step can be talking to a primary-care doctor or a licensed therapist. ' +
            'Treatment often combines therapy, lifestyle support, and (when appropriate) medication.',
        },
      ],
    },
    {
      id: 'addiction',
      icon: '⛓️',
      title: 'Drug Addiction',
      subtitle: 'Behaviors, dangers & paths to help',
      sections: [
        {
          heading: 'Behavioral warning signs',
          list: [
            'Using more, or for longer, than intended — and being unable to cut down',
            'Strong cravings; much of life organized around getting or using the substance',
            'Neglecting responsibilities at work, school, or home',
            'Withdrawing from family and friends; secrecy and isolation',
            'Continuing to use despite clear harm to health or relationships',
          ],
        },
        {
          heading: 'Physical dangers',
          list: [
            'Tolerance (needing more for the same effect) and painful withdrawal symptoms',
            'Risk of overdose — which can be fatal, especially with opioids',
            'Damage to the heart, liver, lungs, and brain over time',
            'Increased risk of infection from injection or impaired judgment',
          ],
        },
        {
          heading: 'Why it’s hard to “just stop”',
          text:
            'Addiction changes brain circuits involved in reward, stress, and self-control, which is why ' +
            'willpower alone often isn’t enough. It is a chronic but treatable medical condition — and ' +
            'recovery is absolutely possible with the right support.',
        },
        {
          tip:
            'SAMHSA’s National Helpline (1-800-662-4357) offers free, confidential, 24/7 referrals to ' +
            'treatment. Recovery is a process, and relapse is a setback — not a failure.',
        },
      ],
    },
    {
      id: 'resilience',
      icon: '🌱',
      title: 'Building Resilience',
      subtitle: 'Everyday habits that armor the mind',
      sections: [
        {
          heading: 'Core protective factors',
          list: [
            'Strong social connection — even one trusted person makes a difference',
            'Regular movement, sleep, and nourishing food',
            'A sense of meaning, purpose, or routine',
            'Naming emotions instead of avoiding them',
          ],
        },
        {
          heading: 'Simple practices to try',
          list: [
            'Box breathing: inhale 4s · hold 4s · exhale 4s · hold 4s',
            'A daily “3 good things” gratitude note',
            'Short walks outside, especially in daylight',
            'Limiting doomscrolling before bed',
          ],
        },
        {
          tip:
            'Resilience isn’t about never struggling — it’s about recovering and adapting. ' +
            'Small, repeated habits build it far more than occasional big efforts.',
        },
      ],
    },
  ],

  // ---------------- Emergency Support Hub ----------------
  warningSigns: [
    'Talking about wanting to die or to kill oneself',
    'Looking for a way to end one’s life',
    'Talking about feeling hopeless or having no reason to live',
    'Talking about feeling trapped or being a burden to others',
    'Increasing use of alcohol or drugs',
    'Withdrawing from friends, family, and activities',
    'Extreme mood swings, rage, or agitation',
    'Giving away prized possessions or saying goodbye',
    'Sleeping too little or too much',
    'Acting anxious, reckless, or agitated',
  ],

  hotlines: [
    {
      name: '988 Suicide & Crisis Lifeline',
      desc: 'Free, confidential support 24/7 for anyone in distress (US). Call or text.',
      call: 'tel:988',
      text: 'sms:988',
      callLabel: 'Call 988',
      textLabel: 'Text 988',
    },
    {
      name: 'Crisis Text Line',
      desc: 'Text HOME to connect with a trained crisis counselor, 24/7 (US).',
      text: 'sms:741741?body=HOME',
      textLabel: 'Text HOME to 741741',
    },
    {
      name: 'SAMHSA National Helpline',
      desc: 'Treatment referral and information for mental health and substance use, 24/7.',
      call: 'tel:18006624357',
      callLabel: 'Call 1-800-662-4357',
    },
    {
      name: 'Find a Helpline (Global)',
      desc: 'Free, confidential support hotlines in 130+ countries.',
      link: 'https://findahelpline.com',
      linkLabel: 'Open directory',
    },
  ],
};
