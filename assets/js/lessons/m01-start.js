COURSE.addModule({
  id: 'm1',
  title: 'Старт: экосистема Java',
  description: 'Как устроен мир Java по сравнению с Node.js: JVM, JDK, версии, инструменты. Установка и первая программа.',
  lessons: [
    {
      id: 'java-ecosystem',
      title: 'Java глазами Node-разработчика',
      minutes: 25,
      goals: [
        'объяснить, чем JVM отличается от V8 и как запускается Java-код',
        'различать JDK, JRE, JVM и понимать, какую версию Java ставить',
        'сопоставить привычные Node-инструменты с их аналогами в Java/Spring',
        'понимать модель «поток на запрос» в отличие от event loop'
      ],
      body: `
<p>Ты уже умеешь писать сервер на Node.js: роутинг, middleware, работа с БД, авторизация, тесты. Хорошая новость — <b>почти все идеи переносятся 1-в-1</b>. Меняются язык, инструменты и несколько фундаментальных вещей: статическая типизация, многопоточность и <dfn>Dependency Injection</dfn> (внедрение зависимостей), на котором построен весь Spring. Этот урок — карта местности.</p>

<h2>Как запускается код: V8 против JVM</h2>
<p>В Node.js ты пишешь <code>node server.js</code>, и движок V8 сразу читает исходник, парсит его и компилирует «на лету» (<dfn>JIT</dfn> — Just-In-Time compilation, компиляция во время выполнения).</p>
<p>В Java два отдельных шага:</p>
<ol>
  <li>Компилятор <code>javac</code> превращает исходник <code>.java</code> в <dfn>bytecode</dfn> (байт-код — промежуточный машинно-независимый код) и сохраняет его в файлы <code>.class</code>.</li>
  <li><dfn>JVM</dfn> (Java Virtual Machine — виртуальная машина Java) загружает байт-код, сначала интерпретирует его, а «горячие» участки компилирует JIT-компилятором в машинный код.</li>
</ol>
${flow('Main.java', 'javac', 'Main.class (bytecode)', 'JVM + JIT', 'машинный код')}
<p>Отсюда главное отличие в ощущениях: <b>ошибки типов ловятся до запуска</b>, на этапе компиляции. Опечатка в имени метода в JS всплывёт только в рантайме (<code>undefined is not a function</code>), а в Java программа просто не скомпилируется.</p>
${node(`<p>Ближайшая аналогия — TypeScript: <code>tsc</code> проверяет типы и выдаёт JS. Но есть важная разница: типы TypeScript <b>стираются</b> и в рантайме их нет, а в Java типы существуют и во время выполнения — JVM не даст положить строку в переменную типа <code>int</code>.</p>`)}

<h2>JDK, JRE, JVM — что это и что ставить</h2>
${table(['Термин', 'Что это', 'Аналогия в Node'], [
  ['<b>JVM</b>', 'Виртуальная машина, исполняющая байт-код', 'Движок V8 + libuv'],
  ['<b>JRE</b> (Java Runtime Environment)', 'JVM + стандартная библиотека. Только чтобы <i>запускать</i>', 'Установленный <code>node</code> без инструментов'],
  ['<b>JDK</b> (Java Development Kit)', 'JRE + компилятор <code>javac</code>, отладчик, утилиты. Чтобы <i>разрабатывать</i>', 'Node + npm + всё для разработки']
])}
<p>Разработчику нужен <b>JDK</b>. Его выпускают разные вендоры из одного открытого кода (OpenJDK): Eclipse Temurin, Amazon Corretto, Oracle OpenJDK, Microsoft Build of OpenJDK — для учёбы разницы нет, бери <b>Eclipse Temurin</b>.</p>

<h3>Версии Java</h3>
<p>Новая версия Java выходит каждые полгода, а раз в два года — <dfn>LTS</dfn> (Long-Term Support, версия с долгой поддержкой), как LTS-релизы Node. В продакшене используют LTS: <b>17, 21, 25</b>. В курсе ориентируемся на <b>Java 21</b> (всё, что здесь показано, работает и на 25). Если видишь в старом коде Java 8 — это древность уровня Node 6, многие современные возможности (<code>var</code>, records, switch-выражения) там отсутствуют.</p>

<h2>Карта соответствий Node → Java</h2>
${table(['Задача', 'Node.js', 'Java / Spring'], [
  ['Язык', 'JavaScript / TypeScript', 'Java (ещё бывает Kotlin — тоже на JVM)'],
  ['Менеджер пакетов и сборка', 'npm / yarn / pnpm, <code>package.json</code>', '<dfn>Maven</dfn> (<code>pom.xml</code>) или <dfn>Gradle</dfn> (<code>build.gradle</code>)'],
  ['Реестр пакетов', 'npmjs.com', 'Maven Central'],
  ['HTTP-фреймворк', 'Express, Fastify, NestJS', 'Spring Web MVC (внутри Spring Boot)'],
  ['Каркас приложения, DI', 'NestJS (частично)', 'Spring Framework + Spring Boot'],
  ['ORM', 'Prisma, TypeORM, Sequelize', 'JPA / Hibernate + Spring Data JPA'],
  ['Миграции БД', 'prisma migrate, knex', 'Flyway, Liquibase'],
  ['Валидация', 'zod, Joi, class-validator', 'Bean Validation (Jakarta Validation)'],
  ['Аутентификация', 'Passport, jsonwebtoken', 'Spring Security'],
  ['Тесты', 'Jest, Vitest, Supertest', 'JUnit 5, Mockito, AssertJ, MockMvc'],
  ['Логирование', 'winston, pino', 'SLF4J + Logback'],
  ['Конфигурация', '<code>.env</code> + dotenv', '<code>application.yml</code> + переменные окружения'],
  ['Автоперезапуск', 'nodemon, <code>node --watch</code>', 'Spring Boot DevTools'],
  ['HTTP-клиент', 'fetch, axios', 'RestClient, WebClient']
])}

<h2>Модель выполнения: event loop против потоков</h2>
<p>Это самое важное концептуальное отличие для серверной разработки.</p>
<p><b>Node.js</b>: один основной поток и <dfn>event loop</dfn> (цикл событий). Ввод-вывод неблокирующий, поэтому всё асинхронное: <code>await db.query()</code> отдаёт управление циклу, и тот обслуживает другие запросы. Заблокируешь поток тяжёлым вычислением — встанет весь сервер.</p>
<p><b>Классический Spring (Web MVC)</b>: модель <dfn>thread-per-request</dfn> (поток на запрос). Встроенный сервер Tomcat держит пул потоков (по умолчанию до 200), и каждый запрос целиком обрабатывается в своём потоке. Код пишется <b>синхронно</b>: <code>userRepository.findById(id)</code> просто блокирует текущий поток до ответа БД — и это нормально, ведь остальные запросы обслуживают другие потоки.</p>
${cmp(js`
// Node: асинхронно, один поток
app.get('/users/:id', async (req, res) => {
  const user = await db.user.findUnique({
    where: { id: Number(req.params.id) }
  });
  res.json(user);
});`, java`
// Spring MVC: синхронно, свой поток на запрос
@GetMapping("/users/{id}")
public User getUser(@PathVariable long id) {
    return userRepository.findById(id)
        .orElseThrow();
}`)}
${info(`<p>Никаких <code>async/await</code> и «заражения» асинхронностью: синхронный код проще читать и отлаживать. Цена — потоки тяжелее, чем колбэки. В Java 21 появились <dfn>virtual threads</dfn> (виртуальные потоки) — лёгкие потоки, которых можно создать миллионы; Spring Boot умеет использовать их одной настройкой. Об этом — в уроке про многопоточность.</p>
<p>Существует и реактивный Spring WebFlux, похожий по модели на Node, но он сложнее и нужен реже. В курсе мы используем Web MVC — это стандарт индустрии.</p>`)}

<h2>Что будет непривычно</h2>
<ul>
  <li><b>Многословность.</b> Java явнее и длиннее JS. Современная Java (records, <code>var</code>, лямбды) сильно сократила «бойлерплейт», а IDE генерирует остальное.</li>
  <li><b>IDE обязательна.</b> В Java принято работать в IntelliJ IDEA: автодополнение, рефакторинги, генерация кода, навигация. Это не роскошь, а основной инструмент.</li>
  <li><b>Номинальная типизация.</b> В TypeScript объект подходит к интерфейсу, если у него нужные поля (структурная типизация). В Java класс должен <i>явно</i> объявить <code>implements</code>.</li>
  <li><b>Всё — внутри класса.</b> Нет свободных функций и модулей-объектов: любой код живёт в классе.</li>
  <li><b>Магия аннотаций.</b> Spring многое делает через <dfn>annotations</dfn> (аннотации — метки вида <code>@Service</code>, которые фреймворк читает и по ним меняет поведение). Сначала это выглядит как магия; к модулю 5 магия превратится в понятные механизмы.</li>
</ul>
`,
      tasks: [
        {
          title: 'Составь свою карту',
          text: `<p>Возьми свой последний Node-проект и выпиши все его зависимости из <code>package.json</code>. Для каждой найди аналог из таблицы выше (или поиском «<i>библиотека</i> java equivalent»).</p>`,
          solution: `<p>Пример для типичного Express-проекта:</p>${table(['Node', 'Java'], [
            ['express', 'spring-boot-starter-web'], ['prisma', 'spring-boot-starter-data-jpa + драйвер БД'], ['zod', 'spring-boot-starter-validation'],
            ['jsonwebtoken, passport', 'spring-boot-starter-security, spring-boot-starter-oauth2-resource-server'], ['dotenv', 'встроено в Spring Boot'],
            ['winston', 'встроено (SLF4J + Logback)'], ['jest, supertest', 'spring-boot-starter-test'], ['nodemon', 'spring-boot-devtools'], ['cors', 'встроено в Spring Web']
          ])}<p>Обрати внимание: многое из того, что в Node — отдельные пакеты, в Spring Boot уже встроено.</p>`
        }
      ],
      quiz: [
        { q: 'Что делает команда <code>javac Main.java</code>?', options: ['Запускает программу', 'Компилирует исходник в байт-код Main.class', 'Скачивает зависимости', 'Компилирует сразу в машинный код .exe'], answer: 1, explain: 'javac — компилятор: из .java получается .class с байт-кодом, который затем исполняет JVM.' },
        { q: 'Что нужно установить разработчику?', options: ['JRE', 'JVM', 'JDK', 'Достаточно IntelliJ IDEA'], answer: 2, explain: 'JDK включает компилятор и инструменты разработки. JRE — только для запуска.' },
        { q: 'Как Spring Web MVC обрабатывает много одновременных запросов?', options: ['Через event loop в одном потоке', 'Каждый запрос обрабатывается в своём потоке из пула', 'Запускает новый процесс на запрос', 'Обрабатывает запросы строго по очереди'], answer: 1, explain: 'Модель thread-per-request: Tomcat держит пул потоков, код пишется синхронно.' },
        { q: 'Какой аналог Prisma в мире Spring?', options: ['Maven', 'Spring Security', 'JPA/Hibernate + Spring Data JPA', 'Logback'], answer: 2, explain: 'JPA — стандарт ORM, Hibernate — его реализация, Spring Data JPA — удобные репозитории поверх.' },
        { q: 'Чем типы Java отличаются от типов TypeScript?', options: ['Ничем', 'Java-типы существуют и проверяются в рантайме, TS-типы стираются при компиляции', 'В Java нет интерфейсов', 'В Java типы необязательны'], answer: 1, explain: 'TypeScript — проверка только на этапе компиляции. JVM знает типы объектов во время выполнения.' }
      ]
    },

    {
      id: 'setup-hello',
      title: 'Установка и первая программа',
      minutes: 30,
      goals: [
        'установить JDK и IntelliJ IDEA',
        'скомпилировать и запустить программу из терминала и из IDE',
        'понимать каждое слово в <code>public static void main</code>',
        'разобраться с пакетами (packages) и структурой файлов'
      ],
      body: `
<h2>Шаг 1. Установка JDK</h2>
<p>Скачай <b>Eclipse Temurin JDK 21</b> (или 25) с сайта adoptium.net — установщик для Windows сам пропишет <code>PATH</code> и <code>JAVA_HOME</code> (отметь эти пункты в установщике). Либо через менеджер пакетов:</p>
${bash`
# Windows
winget install EclipseAdoptium.Temurin.21.JDK

# macOS
brew install --cask temurin@21

# проверка (в новом окне терминала)
java -version
javac -version`}
${info(`<p><dfn>JAVA_HOME</dfn> — переменная окружения с путём к JDK. Её читают Maven, Gradle и IDE. Если <code>java -version</code> работает, а Maven ругается на JAVA_HOME — пропиши её вручную в «Переменные среды» Windows.</p>`)}

<h2>Шаг 2. IDE</h2>
<p>Установи <b>IntelliJ IDEA</b> (бесплатной версии достаточно для всего курса, включая Spring Boot). Альтернатива — VS Code с «Extension Pack for Java» и «Spring Boot Extension Pack», но в Java-мире стандарт де-факто — IDEA, и большинство примеров в интернете подразумевают её.</p>
<p>Полезные горячие клавиши IDEA (Windows): <kbd>Alt</kbd>+<kbd>Enter</kbd> — исправить/импортировать, <kbd>Alt</kbd>+<kbd>Insert</kbd> — сгенерировать (конструктор, геттеры), <kbd>Shift</kbd> <kbd>Shift</kbd> — поиск везде, <kbd>Ctrl</kbd>+<kbd>B</kbd> — перейти к определению, <kbd>Shift</kbd>+<kbd>F6</kbd> — переименовать.</p>

<h2>Шаг 3. Hello, World из терминала</h2>
<p>Создай папку и файл <code>Main.java</code>:</p>
${java`
@@ Main.java
public class Main {
    public static void main(String[] args) {
        System.out.println("Привет, Java!");
        System.out.println("Аргументов передано: " + args.length);
    }
}`}
${bash`
javac Main.java      # компиляция -> появится Main.class
java Main            # запуск (без .class!)

# Начиная с Java 11 можно сразу запустить один файл:
java Main.java`}

<h3>Разбор по словам</h3>
${table(['Часть', 'Значение'], [
  ['<code>public class Main</code>', 'Объявление публичного класса. <b>Имя публичного класса обязано совпадать с именем файла</b>: <code>Main</code> → <code>Main.java</code>.'],
  ['<code>public</code>', '<dfn>access modifier</dfn> (модификатор доступа): метод виден отовсюду, в том числе JVM.'],
  ['<code>static</code>', 'Метод принадлежит классу, а не объекту — JVM может вызвать его, не создавая <code>new Main()</code>.'],
  ['<code>void</code>', 'Метод ничего не возвращает.'],
  ['<code>main(String[] args)</code>', '<dfn>entry point</dfn> (точка входа). <code>args</code> — массив аргументов командной строки, как <code>process.argv.slice(2)</code>.'],
  ['<code>System.out.println</code>', 'Аналог <code>console.log</code>. <code>System</code> — класс, <code>out</code> — его статическое поле (поток вывода), <code>println</code> — метод.']
])}
${tip(`<p>В Java 25 появились «компактные» файлы: можно написать просто <code>void main() { IO.println("Привет"); }</code> без класса. Это удобно для скриптов, но в реальных проектах и во всех материалах ты будешь видеть классическую форму — привыкай к ней.</p>`)}

<h2>Шаг 4. Пакеты</h2>
<p>В Node модуль — это файл, а импорт идёт по относительному пути. В Java код организуется в <dfn>packages</dfn> (пакеты) — пространства имён, которые <b>совпадают со структурой папок</b>. Имя пакета принято начинать с перевёрнутого домена: <code>com.example.shop</code>.</p>
${tree`
src/
└── com/
    └── example/
        └── shop/
            ├── Main.java          // package com.example.shop;
            └── util/
                └── Prices.java    // package com.example.shop.util;`}
${cmp(js`
// util/prices.js
export function withVat(price) {
  return price * 1.2;
}

// main.js
import { withVat } from './util/prices.js';
console.log(withVat(100));`, java`
// com/example/shop/util/Prices.java
package com.example.shop.util;

public class Prices {
    public static double withVat(double price) {
        return price * 1.2;
    }
}

// com/example/shop/Main.java
package com.example.shop;

import com.example.shop.util.Prices;

public class Main {
    public static void main(String[] args) {
        System.out.println(Prices.withVat(100));
    }
}`)}
<ul>
  <li><code>package</code> — первая строка файла, обязана соответствовать пути папки.</li>
  <li><code>import</code> указывает <b>полное имя класса</b>, а не путь к файлу. Классы из того же пакета и из <code>java.lang</code> (<code>String</code>, <code>Math</code>, <code>System</code>) импортировать не нужно.</li>
  <li>Импортов «по умолчанию экспортируется всё» нет: видимость управляется модификаторами <code>public</code>/<code>private</code> (подробно — в уроке про классы).</li>
</ul>

<h2>Шаг 5. Проект в IntelliJ IDEA</h2>
<ol>
  <li><b>File → New → Project</b>, выбери <b>Java</b>, Build system: <b>Maven</b>, JDK: 21.</li>
  <li>IDEA создаст структуру <code>src/main/java</code> — это стандартная раскладка Maven (разберём в модуле 4).</li>
  <li>Создай класс правым кликом по <code>src/main/java</code> → New → Java Class. Набери <code>psvm</code> и нажми <kbd>Tab</kbd> — IDEA развернёт метод <code>main</code>. <code>sout</code> + <kbd>Tab</kbd> → <code>System.out.println()</code>.</li>
  <li>Запуск — зелёный треугольник слева от <code>main</code>.</li>
</ol>
`,
      tasks: [
        {
          title: 'Аргументы командной строки',
          text: `<p>Напиши программу <code>Greeter</code>, которая принимает имена через аргументы и приветствует каждого: <code>java Greeter.java Аня Боря</code> → «Привет, Аня!», «Привет, Боря!». Если аргументов нет — «Привет, незнакомец!».</p><p>Подсказка: цикл <code>for (String name : args) { ... }</code> — аналог <code>for (const name of args)</code>.</p>`,
          solution: java`
            public class Greeter {
                public static void main(String[] args) {
                    if (args.length == 0) {
                        System.out.println("Привет, незнакомец!");
                        return;
                    }
                    for (String name : args) {
                        System.out.println("Привет, " + name + "!");
                    }
                }
            }`
        },
        {
          title: 'Два пакета',
          text: `<p>В IDEA создай проект с пакетами <code>com.example.calc</code> (класс <code>App</code> с <code>main</code>) и <code>com.example.calc.math</code> (класс <code>Ops</code> со статическими методами <code>add</code> и <code>multiply</code> для <code>int</code>). Вызови их из <code>main</code>.</p>`,
          solution: java`
            // com/example/calc/math/Ops.java
            package com.example.calc.math;

            public class Ops {
                public static int add(int a, int b) { return a + b; }
                public static int multiply(int a, int b) { return a * b; }
            }

            // com/example/calc/App.java
            package com.example.calc;

            import com.example.calc.math.Ops;

            public class App {
                public static void main(String[] args) {
                    System.out.println(Ops.add(2, 3));      // 5
                    System.out.println(Ops.multiply(4, 5)); // 20
                }
            }`
        }
      ],
      quiz: [
        { q: 'Публичный класс <code>OrderService</code> должен лежать в файле…', options: ['любом .java', 'OrderService.java', 'order-service.java', 'index.java'], answer: 1, explain: 'Имя публичного класса совпадает с именем файла, с учётом регистра.' },
        { q: 'Зачем <code>main</code> объявлен как <code>static</code>?', options: ['Чтобы работал быстрее', 'Чтобы JVM могла вызвать его без создания объекта', 'Чтобы его нельзя было изменить', 'Это необязательно'], answer: 1, explain: 'static-метод принадлежит классу, объект создавать не нужно.' },
        { q: 'Что указывается в <code>import</code>?', options: ['Относительный путь к файлу', 'Полное имя класса: пакет + имя', 'URL пакета в Maven Central', 'Имя файла .class'], answer: 1, explain: 'Например: import com.example.shop.util.Prices;' },
        { q: 'Аналог <code>console.log</code> в Java:', options: ['print()', 'System.out.println()', 'Console.log()', 'log.info()'], answer: 1, explain: 'System.out.println выводит строку в стандартный вывод. В Spring для логов используют логгер SLF4J.' }
      ]
    }
  ]
});
