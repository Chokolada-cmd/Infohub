export const CONFIG = {
    xpPerLevel: 100,
    xpPerChallenge: 50,
    challengeBonus: 25,
};

export const LESSONS = {
    html: {
        id: 'html',
        title: 'HTML Basics',
        badge: 'HTML',
        xp: 100,
        concept: `
            HTML (HyperText Markup Language) is the foundation
            of every web page. It uses <strong>tags</strong>
            to structure content.
        `,
        visual: {
            type: 'html',
            html: `
                <h1>Hello World!</h1>
                <p>This is a paragraph.</p>
                <a href="#">Click me!</a>
            `,
        },
        challenge: {
            slug: 'first-heading',
            title: 'Create Your First Heading',
            description: 'Write an HTML heading tag with your name:',
            starterCode: '<h1>Your Name</h1>',
            solution: '<h1>Web Dev Student</h1>',
            test: (code) =>
                code.includes('<h1') && code.includes('</h1>') && code.length > 10,
            hint: 'Try: <h1>Your Name</h1>',
            xp: 50,
        },
        nextLesson: 'css',
    },
    css: {
        id: 'css',
        title: 'CSS Styling',
        badge: 'CSS',
        xp: 150,
        concept: `
            CSS (Cascading Style Sheets) controls the
            <strong>look and feel</strong> of your HTML.
            You can change colors, fonts, spacing and layout.
        `,
        visual: {
            type: 'css',
            html: `
                <h1>Hello World!</h1>
                <p>CSS changes how HTML looks.</p>
            `,
            css: `
                h1 { color: blue; text-align: center; }
                p  { color: #555; text-align: center; }
            `,
        },
        challenge: {
            slug: 'style-heading',
            title: 'Style Your Heading',
            description: 'Add CSS to make your heading blue and centered:',
            starterCode: `h1 {\n    /* Add styles here */\n}`,
            solution: `h1 {\n    color: blue;\n    text-align: center;\n}`,
            test: (code) =>
                code.includes('color') &&
                (code.includes('blue') || code.includes('#0000ff')) &&
                code.includes('text-align'),
            hint: 'Use "color: blue;" and "text-align: center;"',
            xp: 50,
        },
        nextLesson: 'js',
    },
    js: {
        id: 'js',
        title: 'JavaScript Logic',
        badge: 'JS',
        xp: 200,
        concept: `
            JavaScript adds <strong>interactivity</strong>
            to web pages. Functions let you write reusable code.
        `,
        visual: {
            type: 'js',
            html: `
                <h2 id="greeting">Hello Student!</h2>
                <button id="demoButton">Click Me</button>
            `,
        },
        challenge: {
            slug: 'greet-function',
            title: 'Write a Greeting Function',
            description: 'Write a function that takes a name and returns "Hello [name]!":',
            starterCode: `function greet(name) {\n    // Your code here\n}`,
            solution: `function greet(name) {\n    return "Hello " + name + "!";\n}`,
            test: (code) =>
                code.includes('function') &&
                code.includes('return') &&
                code.includes('name'),
            hint: 'Use: return "Hello " + name + "!"',
            xp: 75,
        },
        nextLesson: 'react',
    },
    react: {
        id: 'react',
        title: 'React Components',
        badge: 'React',
        xp: 300,
        concept: `
            React is a library for building
            <strong>user interfaces</strong>
            using reusable components.
        `,
        visual: {
            type: 'react',
            html: `
                <div class="react-label">React Component</div>
                <div class="react-card">
                    <h2>Hello, Student!</h2>
                    <p>This is a reusable React component.</p>
                </div>
            `,
        },
        challenge: {
            slug: 'welcome-component',
            title: 'Create a React Component',
            description: 'Write a React component that displays a greeting:',
            starterCode: `function Welcome(props) {\n    return (\n        <div>\n            {/* Your code here */}\n        </div>\n    );\n}`,
            solution: `function Welcome(props) {\n    return <h1>Hello, {props.name}!</h1>;\n}`,
            test: (code) =>
                code.includes('function') &&
                code.includes('return') &&
                code.includes('props'),
            hint: 'Use: return <h1>Hello, {props.name}!</h1>;',
            xp: 100,
        },
        nextLesson: null,
    },
};

export const BADGES = {
    html:       { id: 'html',       name: 'HTML Builder',     description: 'Completed HTML Basics' },
    css:        { id: 'css',        name: 'CSS Stylist',      description: 'Styled your first element' },
    js:         { id: 'js',         name: 'JS Master',        description: 'Wrote your first function' },
    react:      { id: 'react',      name: 'React Developer',  description: 'Built your first component' },
    'level-5':  { id: 'level-5',    name: 'Level 5 Achieved', description: 'Reached level 5' },
    'level-10': { id: 'level-10',   name: 'Level 10 Achieved',description: 'Reached level 10' },
};