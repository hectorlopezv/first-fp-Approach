const { chain } = require("lodash");
const { save, all } = require("../lib/db");
const { Task, Id } = require("../lib/types");
const { last } = require("rambda");

const { liftF } = require("../lib/free");

const { taggedSum } = require("daggy");

const Console = taggedSum("Console", {
  Question: ["q"],
  Print: ["s"],
});

const Db = taggedSum("Db", {
  Save: ["table", "record"],
  All: ["table", "query"],
});
const dbToTask = (x) => x.cata({ Save: save, All: all });
const consoleToTask = (x) => x.cata({ Question: getInput, Print: writeOutput });
const AuthorTable = "Authors";
const PostTable = "Post";
const Author = (name) => ({ name });
const Post = (text, body) => ({ text, body });
const readline = require("readline").createInterface({
  input: process.stdin,
  output: process.stdout,
});

const getInput = (q) =>
  Task((rej, res) => readline.question(q, (i) => res(i.trim())));

//a --> m(a-> m(a-> m))
// Fix f -> f (Fix f)
// Free m -> m (Free m) | Pure
const formatPost = (post) => `${post.text}:\n${post.body}`;

//Free monads
const print = (s) => liftF(Console.Print(s));
const question = (s) => liftF(Console.Question(s));
const dbAll = (table, query) => liftF(Db.All(table, query));
const dbSave = (table, record) => liftF(Db.Save(table, record));


const writeOutput = (str) => Task((rej, res) => res(console.log(str)));


///()--> Task --> () --> Task
const latest = () =>
  dbAll(PostTable)
    .map((post) => last(post))
    .map(formatPost)
    .chain(print)
    .map(() => menu);
const menu = () =>
  question(
    " Where do you want to go today? (createUAthor, write, latest, all, menu"
  ).map((route) => router[route]);

///()--> Task --> () --> Task
const createAuthor = () =>
  question("Name?")
    .map((name) => Author(name)) //Task(Author)
    .chain((author) => dbSave(AuthorTable, author)) //Task(Task(x)) --> Task(x)
    .map(() => menu);

const write = (msg) =>
  question("write your message")
    .chain((text) => question("body").map((body) => Post(text, body)))
    .chain((post) => dbSave(PostTable, post))
    .map(() => latest);

const router = { menu, createAuthor, write, latest };
const interpret = (x) => (x.table ? dbToTask(x) : consoleToTask(x));
const start = () =>
  dbAll(AuthorTable).map((authors) => (authors.length ? menu : createAuthor));
console.log("hello")
const runApp = (f) => {
  console.log("f", f);
  return f().foldMap(interpret, Task.of).fork(console.error, runApp); //f(x)->g--> runApp(g)
};

runApp(start);
