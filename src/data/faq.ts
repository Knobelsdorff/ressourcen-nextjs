export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

export const faqData: FAQItem[] = [
  {
    id: "1",
    question: "What is this app and how does it work?",
    answer: "Our app helps you regulate your emotions through personalized AI-powered guided audio stories. You choose an inner resource (a protective figure, safe place, or symbol of strength), answer a few questions about what you need, and our AI creates a unique story designed to calm your nervous system. You can then listen to this story whenever you feel stressed or anxious.",
    category: "General"
  },
  {
    id: "2",
    question: "Do I need to believe in spirituality for this to work?",
    answer: "No! While you can choose spiritual resources like angels or guides, everything works on a psychological level. You can select completely secular resources like a safe place, a loving person, or even a fictional character. The app meets you where you are - no spiritual belief required.",
    category: "General"
  },
  {
    id: "3",
    question: "How is this different from meditation apps?",
    answer: "Unlike meditation apps that require you to sit still and focus on breathing, our app works through personalized storytelling. You simply listen to your custom audio story - no special breathing techniques or sitting positions required. Each story is unique to you, not a pre-recorded generic script.",
    category: "Features"
  },
  {
    id: "4",
    question: "How long does a typical session take?",
    answer: "Most audio stories are around 2-3 minutes long, making them perfect for quick emotional resets during your day. You can listen while sitting, lying down, or even during a short break at work.",
    category: "Usage"
  },
  {
    id: "5",
    question: "Can I create multiple resources?",
    answer: "Yes! You can create as many inner resources as you like. Some people prefer different resources for different situations - maybe a protective figure for anxiety and a safe place for stress.",
    category: "Features"
  },
  {
    id: "6",
    question: "Is my data private and secure?",
    answer: "Absolutely. Your personal information, chosen resources, and generated stories are completely private. We use industry-standard encryption and never share your data with third parties. Your emotional journey is yours alone.",
    category: "Privacy"
  },
  {
    id: "7",
    question: "Why does this actually work?",
    answer: "Your brain responds to imagined experiences almost like real ones. When you engage with a personalized story that activates feelings of safety and calm, your nervous system responds by slowing your stress response, making your body feel safer, and helping your thoughts become less chaotic. This is based on proven techniques from trauma therapy and guided imagery.",
    category: "Science"
  },
  {
    id: "8",
    question: "Can I use this during a panic attack?",
    answer: "Yes! Many users find our app particularly helpful during acute stress or anxiety moments. The stories are designed to be grounding and can help activate your parasympathetic nervous system, which counteracts the fight-or-flight response.",
    category: "Usage"
  },
  {
    id: "9",
    question: "Do I need headphones?",
    answer: "While not required, headphones or earbuds can help you focus better on the audio and create a more immersive experience. Many users find it helpful to minimize distractions.",
    category: "Usage"
  },
  {
    id: "10",
    question: "Is there a free trial?",
    answer: "Yes! You can try your first story completely free with no credit card required. This lets you experience the full process and see if it works for you before committing.",
    category: "Pricing"
  },
  {
    id: "11",
    question: "What if I don't like my generated story?",
    answer: "You can always regenerate a new story with different answers or choose a different resource entirely. Each generation creates something unique, so you can experiment until you find what resonates with you.",
    category: "Features"
  },
  {
    id: "12",
    question: "Can I save my favorite stories?",
    answer: "Yes! You can save and replay your favorite stories as many times as you want. Some users have a few go-to stories they return to regularly.",
    category: "Features"
  },
  {
    id: "13",
    question: "Who created this app?",
    answer: "Our app was created by a team combining expertise in psychology, AI technology, and trauma-informed care. We're passionate about making nervous system regulation accessible to everyone.",
    category: "About"
  },
  {
    id: "14",
    question: "Is this a replacement for therapy?",
    answer: "No, this app is a complementary tool for emotional regulation, not a replacement for professional mental health treatment. If you're struggling with serious mental health issues, please consult with a licensed therapist or healthcare provider.",
    category: "General"
  },
  {
    id: "15",
    question: "What happens after I answer the questions?",
    answer: "Our AI analyzes your responses and creates a personalized narrative that incorporates your chosen resource, your specific needs, and the feelings you want to cultivate. This story is then converted into a calm, guided audio experience with a soothing voice.",
    category: "How It Works"
  }
];

export const faqCategories = Array.from(
  new Set(faqData.map(item => item.category).filter(Boolean))
) as string[];
