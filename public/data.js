/* ============================================================
   MindArmor — static content (activities, quiz, vault, crisis)
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

  // ---------------- Communication Shield quiz ----------------
  // Each option maps to a style. Tally decides the dominant style.
  quiz: [
    {
      scenario: 'At work',
      question: 'A teammate keeps taking credit for your ideas in meetings. What do you do?',
      options: [
        { text: 'Say nothing and quietly feel resentful — it’s not worth the drama.', style: 'Passive' },
        { text: 'Privately ask them to acknowledge shared work next time, and speak up in the moment going forward.', style: 'Assertive' },
        { text: 'Call them out sharply in front of everyone so they’re embarrassed.', style: 'Aggressive' },
      ],
    },
    {
      scenario: 'With a friend',
      question: 'A close friend cancels plans last-minute for the third time. How do you respond?',
      options: [
        { text: '“No worries at all!” — even though you’re hurt and disappointed.', style: 'Passive' },
        { text: '“I understand things come up, but this keeps happening and it’s frustrating. Can we find a plan that sticks?”', style: 'Assertive' },
        { text: '“Forget it. You’re obviously a flake and I’m done making plans with you.”', style: 'Aggressive' },
      ],
    },
    {
      scenario: 'At home',
      question: 'Your roommate consistently leaves dishes for you to clean. You decide to…',
      options: [
        { text: 'Keep cleaning them yourself and hope they notice eventually.', style: 'Passive' },
        { text: 'Calmly propose a chore schedule and explain how the mess affects you.', style: 'Assertive' },
        { text: 'Pile their dirty dishes on their bed to “teach them a lesson.”', style: 'Aggressive' },
      ],
    },
    {
      scenario: 'Setting a boundary',
      question: 'Someone asks for a favor you genuinely don’t have time for. You…',
      options: [
        { text: 'Say yes anyway and overextend yourself, then feel drained and used.', style: 'Passive' },
        { text: '“I’d love to help, but I can’t take this on right now. Here’s what I can do instead…”', style: 'Assertive' },
        { text: '“Why is that my problem? Figure it out yourself.”', style: 'Aggressive' },
      ],
    },
    {
      scenario: 'Receiving criticism',
      question: 'Your manager gives you tough but fair feedback on a project. Your gut reaction is to…',
      options: [
        { text: 'Apologize profusely, agree with everything, and shrink — even points you disagree with.', style: 'Passive' },
        { text: 'Listen, ask clarifying questions, and share your perspective where it differs.', style: 'Assertive' },
        { text: 'Get defensive, make excuses, and blame teammates or unclear instructions.', style: 'Aggressive' },
      ],
    },
  ],

  // Detailed analysis per dominant style.
  styles: {
    Assertive: {
      tagline: 'Clear, confident, and respectful — of yourself and others.',
      summary:
        'You tend to express your needs and feelings openly while still honoring the other person. ' +
        'This is widely considered the healthiest communication style: it protects your boundaries, ' +
        'reduces resentment, and builds trust because people know where they stand with you.',
      strengths: [
        'You state needs directly without attacking or apologizing for them.',
        'You can say “no” and set boundaries without guilt.',
        'You listen to others and stay open to feedback.',
        'Conflicts tend to resolve rather than simmer.',
      ],
      growth: [
        'Watch for moments where stress nudges you toward bluntness — pair honesty with warmth.',
        'Keep checking that “assertive” doesn’t slide into “always right.” Curiosity keeps it balanced.',
      ],
    },
    Passive: {
      tagline: 'Accommodating and kind — but often at your own expense.',
      summary:
        'You tend to prioritize keeping the peace over voicing your own needs. While this can make you ' +
        'easy to be around, unspoken feelings often build into resentment, burnout, or a sense of being ' +
        'overlooked. Your needs matter just as much as everyone else’s — and saying so is a skill you can build.',
      strengths: [
        'You’re empathetic and genuinely considerate of others.',
        'You rarely escalate conflict or hurt people impulsively.',
        'You’re a calm, steady presence in tense moments.',
      ],
      growth: [
        'Practice naming one need per day, even something small (“I’d prefer this restaurant”).',
        'Try the formula: “When ___ happens, I feel ___. What I’d like is ___.”',
        'Remember: a boundary isn’t an attack. “No” is a complete sentence.',
        'Notice physical signals of resentment — they’re a cue you skipped voicing something.',
      ],
    },
    Aggressive: {
      tagline: 'Direct and forceful — but it can cost you trust and connection.',
      summary:
        'You’re not afraid to say what you think, which means your needs rarely go unheard. The risk is that ' +
        'force can tip into blame, sarcasm, or steamrolling — leaving others defensive or distant. ' +
        'The good news: the underlying directness is a strength. Channeled with empathy, it becomes assertiveness.',
      strengths: [
        'You’re honest and people rarely have to guess what you want.',
        'You can make hard decisions and stand your ground under pressure.',
        'You don’t bottle things up until they explode.',
      ],
      growth: [
        'Pause before reacting — a 6-second breath lets the thinking brain catch up.',
        'Swap “you” accusations for “I” statements: “I felt blindsided” vs. “You blindsided me.”',
        'Aim to win the relationship, not just the argument. Ask: “What outcome do I actually want?”',
        'Watch for sarcasm and volume — they read as contempt even when you don’t mean them to.',
      ],
    },
  },

  // ---------------- The Vault — education matrix ----------------
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
