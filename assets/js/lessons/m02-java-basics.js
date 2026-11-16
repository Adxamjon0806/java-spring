COURSE.addModule({
  id: 'm2',
  title: 'Язык Java: основа',
  description: 'Типы, управляющие конструкции, классы, интерфейсы, records, enum и исключения — всё через сравнение с JS/TS.',
  lessons: [
    {
      id: 'types-variables',
      title: 'Типы, переменные и строки',
      minutes: 35,
      goals: [
        'различать примитивные и ссылочные типы',
        'объявлять переменные явно и через <code>var</code>',
        'правильно сравнивать строки и объекты (<code>==</code> vs <code>equals</code>)',
        'избегать ловушек с целочисленным делением, переполнением и деньгами'
      ],
      body: `
<h2>Статическая типизация</h2>
<p>Каждая переменная в Java имеет тип, известный на этапе компиляции, и поменять его нельзя.</p>
${cmp(js`
let count = 10;
count = "десять";   // JS не против

const name = "Аня";
let price = 99.9;
let active = true;`, java`
int count = 10;
count = "десять";   // ошибка компиляции!

final String name = "Аня";  // final ≈ const
double price = 99.9;
boolean active = true;`)}
<p><code>final</code> — аналог <code>const</code>: переменной нельзя присвоить новое значение. Как и в JS, это не делает сам объект неизменяемым.</p>

<h2>Примитивные типы</h2>
<p>В JS есть один <code>number</code>. В Java — восемь <dfn>primitive types</dfn> (примитивных типов), которые хранят значение напрямую, не являются объектами и <b>не могут быть <code>null</code></b>.</p>
${table(['Тип', 'Размер', 'Пример', 'Когда использовать'], [
  ['<code>int</code>', '32 бита, ±2,1 млрд', '<code>int age = 30;</code>', 'Целые по умолчанию'],
  ['<code>long</code>', '64 бита', '<code>long id = 9_000_000_000L;</code>', 'ID из БД, время в мс, большие числа'],
  ['<code>double</code>', '64 бита, дробное', '<code>double ratio = 0.75;</code>', 'Дробные (но не деньги!)'],
  ['<code>boolean</code>', 'true/false', '<code>boolean ok = true;</code>', 'Флаги'],
  ['<code>char</code>', '16 бит, один символ', "<code>char c = 'A';</code>", 'Символ — в <b>одинарных</b> кавычках'],
  ['<code>byte</code>, <code>short</code>, <code>float</code>', '8/16/32 бита', '', 'Редко: бинарные данные, экономия памяти']
])}
${warn(`<p><code>'A'</code> и <code>"A"</code> — разные вещи: первое — <code>char</code>, второе — <code>String</code>. Строки всегда в двойных кавычках.</p>`)}

<h2>Ссылочные типы и null</h2>
<p>Всё остальное — <dfn>reference types</dfn> (ссылочные типы): <code>String</code>, массивы, любые классы. Переменная хранит ссылку на объект в куче, как в JS переменная хранит ссылку на объект. Ссылка может быть <code>null</code> (в Java нет <code>undefined</code>).</p>
<p>Для каждого примитива есть класс-обёртка (<dfn>wrapper class</dfn>): <code>Integer</code>, <code>Long</code>, <code>Double</code>, <code>Boolean</code>… Они нужны, когда требуется объект: в коллекциях (<code>List&lt;Integer&gt;</code> — нельзя <code>List&lt;int&gt;</code>) и когда значение может отсутствовать. Преобразование происходит автоматически — <dfn>autoboxing</dfn>/unboxing.</p>
${java`
Integer maybeAge = null;   // обёртка может быть null
int age = maybeAge;        // NullPointerException при распаковке!

Integer boxed = 42;        // autoboxing: int -> Integer
int unboxed = boxed + 1;   // unboxing: Integer -> int`}
${info(`<p><dfn>NullPointerException</dfn> (NPE) — самая частая ошибка в Java, аналог <code>Cannot read properties of null</code>. Оператора <code>?.</code> в Java нет; вместо него — явные проверки и <code>Optional</code> (будет в модуле 3).</p>`)}

<h2>var — вывод типа</h2>
<p>С Java 10 для локальных переменных можно писать <code>var</code>: тип выведется из правой части. Это <b>не</b> динамическая типизация — тип всё равно фиксирован.</p>
${java`
var users = new ArrayList<String>();   // тип: ArrayList<String>
var total = 0L;                        // тип: long
total = "много";                       // ошибка компиляции

// var нельзя для полей класса, параметров методов и без инициализатора:
var x;                                 // ошибка`}
${tip(`<p>Используй <code>var</code>, когда тип очевиден из правой части (<code>new</code>, вызов фабрики). Если тип неочевиден, явное объявление читается лучше.</p>`)}

<h2>Операторы и арифметика: ловушки</h2>
${java`
int a = 7, b = 2;
System.out.println(a / b);        // 3   — целочисленное деление!
System.out.println(a / 2.0);      // 3.5 — один из операндов double
System.out.println((double) a / b); // 3.5 — явное приведение (cast)
System.out.println(a % b);        // 1

int max = Integer.MAX_VALUE;      // 2147483647
System.out.println(max + 1);      // -2147483648 — переполнение без ошибки!

System.out.println(0.1 + 0.2);    // 0.30000000000000004 — как в JS`}
<p>Для денег используют <code>BigDecimal</code> — точную десятичную арифметику:</p>
${java`
import java.math.BigDecimal;

BigDecimal price = new BigDecimal("19.99");   // из строки, не из double!
BigDecimal total = price.multiply(BigDecimal.valueOf(3));  // 59.97
// операторы + - * не работают с объектами: только методы add/subtract/multiply`}
<p>Операторы сравнения: <code>==</code> и <code>!=</code> (никаких <code>===</code>). Логические: <code>&amp;&amp;</code>, <code>||</code>, <code>!</code>. Тернарный: <code>cond ? a : b</code>. Инкремент <code>++</code>, составные <code>+=</code> — всё как в JS.</p>

<h2>Нет truthy/falsy</h2>
<p>Условие в Java должно быть строго <code>boolean</code>. Привычное <code>if (user)</code> или <code>if (list.length)</code> не скомпилируется.</p>
${cmp(js`
if (user) { ... }
if (items.length) { ... }
if (!name) { ... }
const title = input || "Без названия";`, java`
if (user != null) { ... }
if (!items.isEmpty()) { ... }
if (name == null || name.isBlank()) { ... }
String title = (input != null) ? input : "Без названия";`)}

<h2>Строки</h2>
<p><code>String</code> — <dfn>immutable</dfn> (неизменяемый) объект, как строки в JS. Основные методы похожи:</p>
${table(['JavaScript', 'Java'], [
  ['<code>s.length</code>', '<code>s.length()</code> — это метод!'],
  ['<code>s.toUpperCase()</code>', '<code>s.toUpperCase()</code>'],
  ['<code>s.includes("x")</code>', '<code>s.contains("x")</code>'],
  ['<code>s.startsWith("x")</code>', '<code>s.startsWith("x")</code>'],
  ['<code>s.trim()</code>', '<code>s.strip()</code> (или <code>trim()</code>)'],
  ['<code>s.split(",")</code>', '<code>s.split(",")</code> → <code>String[]</code> (аргумент — регулярка!)'],
  ['<code>s[0]</code>', '<code>s.charAt(0)</code>'],
  ['<code>s.replaceAll("a", "b")</code>', '<code>s.replace("a", "b")</code> (все вхождения)'],
  ['<code>!s.trim()</code>', '<code>s.isBlank()</code>'],
  ['<code>arr.join(", ")</code>', '<code>String.join(", ", list)</code>'],
  ['<code>Number("42")</code>', '<code>Integer.parseInt("42")</code>'],
  ['<code>String(42)</code>', '<code>String.valueOf(42)</code>']
])}
<h3>Интерполяция</h3>
<p>Шаблонных строк вида <code>Hello, \${name}</code> в Java нет. Варианты:</p>
${java`
String name = "Аня";
int age = 25;

String a = "Привет, " + name + "! Тебе " + age;          // конкатенация
String b = String.format("Привет, %s! Тебе %d", name, age); // как printf
String c = "Привет, %s! Тебе %d".formatted(name, age);   // то же, короче (Java 15+)
// %s — строка/что угодно, %d — целое, %.2f — дробное с 2 знаками`}

<h2>Главная ловушка: == против equals</h2>
<p>Для ссылочных типов <code>==</code> сравнивает <b>ссылки</b> (тот же ли это объект), а не содержимое. Содержимое сравнивает метод <code>equals</code>.</p>
${java`
String a = "hello";
String b = new String("hello");

System.out.println(a == b);        // false — разные объекты
System.out.println(a.equals(b));   // true  — одинаковое содержимое

// безопасно, если a может быть null:
System.out.println("hello".equals(a));
System.out.println(java.util.Objects.equals(a, b));`}
${warn(`<p>Иногда <code>==</code> для строк «случайно работает» (литералы кэшируются JVM), из-за чего баг не виден в тестах. То же с обёртками: <code>Integer</code> от -128 до 127 кэшируются, поэтому <code>Integer x = 127, y = 127; x == y</code> → true, а для 128 → false. <b>Правило: объекты всегда сравнивай через <code>equals</code>, примитивы — через <code>==</code>.</b></p>`)}

<h2>Соглашения об именовании</h2>
${table(['Что', 'Стиль', 'Пример'], [
  ['Классы, интерфейсы, enum, record', 'PascalCase', '<code>UserService</code>'],
  ['Методы, переменные, поля', 'camelCase', '<code>findByEmail</code>, <code>totalPrice</code>'],
  ['Константы (<code>static final</code>)', 'UPPER_SNAKE_CASE', '<code>MAX_RETRIES</code>'],
  ['Пакеты', 'нижний регистр, через точки', '<code>com.example.orders</code>']
])}
`,
      tasks: [
        {
          title: 'Конвертер температуры',
          text: `<p>Напиши метод <code>static double toFahrenheit(double celsius)</code> (формула: C × 9/5 + 32) и выведи результат для 36.6 с двумя знаками после запятой. Почему <code>celsius * 9 / 5</code> работает правильно, а <code>9 / 5 * celsius</code> даст неверный ответ?</p>`,
          solution: `${java`
            public class Temp {
                static double toFahrenheit(double celsius) {
                    return celsius * 9 / 5 + 32;
                }

                public static void main(String[] args) {
                    System.out.println("%.2f".formatted(toFahrenheit(36.6))); // 97.88
                }
            }`}<p><code>9 / 5</code> — деление двух <code>int</code>, результат <code>1</code>, а не <code>1.8</code>. В <code>celsius * 9 / 5</code> сначала вычисляется <code>double * int</code> = <code>double</code>, и дальше деление уже дробное. Надёжнее писать <code>9.0 / 5</code>.</p>`
        },
        {
          title: 'Найди баги',
          text: `<p>Что не так в этом коде?</p>${java`
            String role = request.getParameter("role");
            if (role == "admin") {
                grantAccess();
            }
            Integer count = cache.get("count"); // может вернуть null
            int next = count + 1;`}`,
          solution: `<ol><li><code>role == "admin"</code> сравнивает ссылки. Нужно <code>"admin".equals(role)</code> — так ещё и NPE не будет, если <code>role == null</code>.</li><li><code>count + 1</code> распаковывает <code>Integer</code> в <code>int</code>; если <code>count == null</code> — NullPointerException. Нужна проверка: <code>int next = (count == null ? 0 : count) + 1;</code></li></ol>`
        }
      ],
      quiz: [
        { q: 'Что выведет <code>System.out.println(5 / 2);</code>?', options: ['2.5', '2', '3', 'Ошибка компиляции'], answer: 1, explain: 'Оба операнда int → целочисленное деление, дробная часть отбрасывается.' },
        { q: 'Как правильно проверить, что строка <code>s</code> равна "yes"?', options: ['s == "yes"', 's === "yes"', '"yes".equals(s)', 's.compare("yes")'], answer: 2, explain: 'equals сравнивает содержимое; вызов на литерале защищает от NPE.' },
        { q: 'Какой тип может быть <code>null</code>?', options: ['int', 'boolean', 'Integer', 'double'], answer: 2, explain: 'Примитивы не бывают null, обёртки (ссылочные типы) — могут.' },
        { q: 'Скомпилируется ли <code>if (list.size()) { ... }</code>?', options: ['Да, 0 — это false', 'Нет, условие должно быть boolean', 'Да, но с предупреждением', 'Только с var'], answer: 1, explain: 'В Java нет truthy/falsy. Пиши list.size() > 0 или !list.isEmpty().' },
        { q: 'Какой тип выбрать для суммы заказа в рублях с копейками?', options: ['double', 'float', 'BigDecimal', 'int'], answer: 2, explain: 'BigDecimal даёт точную десятичную арифметику. Альтернатива — long в копейках.' }
      ]
    },

    {
      id: 'control-flow',
      title: 'Управление потоком, массивы и методы',
      minutes: 30,
      goals: [
        'писать условия, циклы и современные switch-выражения',
        'использовать text blocks для многострочных строк',
        'работать с массивами',
        'объявлять методы, перегрузку и varargs'
      ],
      body: `
<h2>if, циклы — почти как в JS</h2>
${java`
for (int i = 0; i < 5; i++) {
    if (i == 2) continue;
    System.out.println(i);
}

String[] names = {"Аня", "Боря"};
for (String name : names) {          // аналог for...of
    System.out.println(name);
}

int attempts = 0;
while (attempts < 3) {
    attempts++;
}

do {
    attempts--;
} while (attempts > 0);`}
${node(`<p><code>for (const x of arr)</code> → <code>for (Type x : arr)</code>. Аналога <code>for...in</code> по ключам объекта нет — вместо объектов-словарей используются <code>Map</code> (модуль 3).</p>`)}

<h2>switch: старый и новый</h2>
<p>Старый <code>switch</code> из C/JS с <code>break</code> всё ещё работает, но в современной Java (14+) используют <dfn>switch expression</dfn> со стрелками: без «проваливания», и он <b>возвращает значение</b>.</p>
${cmp(java`
// старый стиль — как в JS
String type;
switch (day) {
    case "SAT":
    case "SUN":
        type = "выходной";
        break;
    default:
        type = "будний";
}`, java`
// современный стиль
String type = switch (day) {
    case "SAT", "SUN" -> "выходной";
    default -> "будний";
};

int len = switch (day) {
    case "MON" -> 1;
    default -> {
        System.out.println("блок");
        yield 0;   // yield возвращает значение из блока
    }
};`, 'Классический', 'Современный')}

<h3>Pattern matching в switch (Java 21)</h3>
<p>Switch умеет проверять тип значения и сразу приводить его к переменной, а также добавлять условия через <code>when</code>:</p>
${java`
static String describe(Object o) {
    return switch (o) {
        case null -> "пусто";
        case Integer i when i > 0 -> "положительное число " + i;
        case Integer i -> "число " + i;
        case String s -> "строка длиной " + s.length();
        default -> "что-то ещё: " + o;
    };
}`}
<p>Это особенно мощно с <code>sealed</code>-интерфейсами и <code>record</code> — увидим через урок.</p>

<h2>Text blocks — многострочные строки</h2>
<p>Аналог многострочных шаблонных строк JS (но без интерполяции). Удобно для JSON, SQL, HTML в тестах:</p>
${java`
String json = """
    {
      "name": "Аня",
      "age": 25
    }
    """;

String sql = """
    SELECT id, email
    FROM users
    WHERE active = true
    """;

String greeting = """
    Привет, %s!
    """.formatted("Аня");`}
<p>Общий отступ слева убирается автоматически по положению закрывающих <code>"""</code>.</p>

<h2>Массивы</h2>
<p>Массив в Java — <b>фиксированного размера</b>, с элементами одного типа. Динамический «массив как в JS» — это <code>ArrayList</code> (модуль 3). На практике в бизнес-коде массивы встречаются редко, чаще — <code>List</code>.</p>
${java`
int[] nums = {5, 3, 8};
int[] zeros = new int[10];          // 10 нулей
String[] empty = new String[3];     // три null

nums[0] = 42;
System.out.println(nums.length);    // 3 — поле, не метод
System.out.println(nums[5]);        // ArrayIndexOutOfBoundsException (в JS было бы undefined)

System.out.println(nums);                      // [I@1b6d3586 — адрес, а не содержимое!
System.out.println(java.util.Arrays.toString(nums)); // [42, 3, 8]
java.util.Arrays.sort(nums);`}

<h2>Методы</h2>
<p>Функций вне классов нет: всё — методы. Пока мы пишем <code>static</code>-методы (они вызываются через класс, как обычные функции). Тип каждого параметра и возвращаемого значения указывается явно.</p>
${cmp(js`
function area(width, height = width) {
  return width * height;
}

area(3);      // 9
area(3, 4);   // 12

function sum(...nums) {
  return nums.reduce((a, b) => a + b, 0);
}`, java`
static int area(int width, int height) {
    return width * height;
}

// параметров по умолчанию нет → перегрузка
static int area(int side) {
    return area(side, side);
}

static int sum(int... nums) {   // varargs
    int total = 0;
    for (int n : nums) total += n;
    return total;
}`)}
<ul>
  <li><dfn>Overloading</dfn> (перегрузка) — несколько методов с одним именем, но разными параметрами. Компилятор выбирает нужный по типам аргументов. Так в Java делают «параметры по умолчанию».</li>
  <li><dfn>varargs</dfn> (<code>int... nums</code>) — переменное число аргументов, внутри это массив. Аналог rest-параметров.</li>
  <li>Аргументы передаются <b>по значению</b>; для объектов значением является ссылка — ровно как в JS: переприсвоить параметр бесполезно, а изменить переданный объект — можно.</li>
</ul>
`,
      tasks: [
        {
          title: 'FizzBuzz на switch',
          text: `<p>Для чисел 1..20 выведи «Fizz» (делится на 3), «Buzz» (на 5), «FizzBuzz» (на 15) или само число. Используй switch-выражение с паттернами и <code>when</code> или обычный if — как больше нравится, но попробуй оба варианта.</p>`,
          solution: java`
            public class FizzBuzz {
                static String fizz(int n) {
                    return switch (n % 15) {
                        case 0 -> "FizzBuzz";
                        case 3, 6, 9, 12 -> "Fizz";
                        case 5, 10 -> "Buzz";
                        default -> String.valueOf(n);
                    };
                }

                public static void main(String[] args) {
                    for (int i = 1; i <= 20; i++) {
                        System.out.println(fizz(i));
                    }
                }
            }`
        },
        {
          title: 'Статистика массива',
          text: `<p>Напиши методы <code>min(int... nums)</code>, <code>max(int... nums)</code> и <code>avg(int... nums)</code> (возвращает <code>double</code>). Если массив пустой — бросай <code>new IllegalArgumentException("empty")</code>.</p>`,
          solution: java`
            static int min(int... nums) {
                if (nums.length == 0) throw new IllegalArgumentException("empty");
                int m = nums[0];
                for (int n : nums) if (n < m) m = n;
                return m;
            }

            static int max(int... nums) {
                if (nums.length == 0) throw new IllegalArgumentException("empty");
                int m = nums[0];
                for (int n : nums) if (n > m) m = n;
                return m;
            }

            static double avg(int... nums) {
                if (nums.length == 0) throw new IllegalArgumentException("empty");
                long sum = 0;                 // long — чтобы не переполниться
                for (int n : nums) sum += n;
                return (double) sum / nums.length;
            }`
        }
      ],
      quiz: [
        { q: 'Что вернёт <code>switch</code> со стрелками, если ни один <code>case</code> не подошёл и нет <code>default</code> (для String)?', options: ['null', 'Пустую строку', 'Не скомпилируется: switch-выражение должно быть исчерпывающим', 'Выбросит исключение в рантайме'], answer: 2, explain: 'Switch-выражение обязано покрывать все варианты — для String это требует default.' },
        { q: 'Как в Java сделать «параметр по умолчанию»?', options: ['int x = 5 в сигнатуре', 'Перегрузкой метода', 'Аннотацией @Default', 'Никак'], answer: 1, explain: 'Объявляется второй метод с меньшим числом параметров, который вызывает первый.' },
        { q: 'Что произойдёт при <code>arr[10]</code> для массива длины 3?', options: ['Вернётся null', 'Вернётся 0', 'ArrayIndexOutOfBoundsException', 'Массив расширится'], answer: 2, explain: 'В отличие от JS, выход за границы — исключение.' },
        { q: 'Для чего <code>yield</code> в switch?', options: ['Для генераторов как в JS', 'Чтобы вернуть значение из блока { } внутри switch-выражения', 'Чтобы пропустить case', 'Для асинхронности'], answer: 1, explain: 'Если ветке нужен блок кода, значение из него возвращается через yield.' }
      ]
    },

    {
      id: 'classes-objects',
      title: 'Классы и объекты',
      minutes: 40,
      goals: [
        'объявлять классы с полями, конструкторами и методами',
        'использовать модификаторы доступа и инкапсуляцию',
        'понимать <code>static</code>, <code>final</code> и <code>this</code>',
        'переопределять <code>toString</code>, <code>equals</code> и <code>hashCode</code>'
      ],
      body: `
<h2>Класс в JS и в Java</h2>
${cmp(js`
class User {
  #email;               // приватное поле

  constructor(id, name, email) {
    this.id = id;
    this.name = name;
    this.#email = email;
  }

  get email() { return this.#email; }

  greet() {
    return \`Привет, \${this.name}\`;
  }
}

const u = new User(1, "Аня", "a@x.ru");`, java`
public class User {
    private final long id;
    private String name;
    private String email;

    public User(long id, String name, String email) {
        this.id = id;
        this.name = name;
        this.email = email;
    }

    public long getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }

    public String greet() {
        return "Привет, " + name;
    }
}

User u = new User(1, "Аня", "a@x.ru");`)}
<p>Главные отличия:</p>
<ul>
  <li><b>Поля объявляются заранее</b> с типами. Нельзя добавить поле объекту на лету, как <code>u.age = 30</code> в JS.</li>
  <li><b>Конструктор</b> называется как класс и не имеет возвращаемого типа. Если конструктора нет — компилятор создаст пустой без параметров (<dfn>default constructor</dfn>).</li>
  <li><code>this</code> всегда указывает на текущий объект — никаких проблем с потерей контекста, <code>bind</code> и стрелочных функций ради <code>this</code>.</li>
  <li><code>this.</code> можно не писать, если нет конфликта имён: <code>return name;</code> — это поле.</li>
</ul>

<h2>Модификаторы доступа</h2>
${table(['Модификатор', 'Кто видит', 'Когда использовать'], [
  ['<code>private</code>', 'Только этот класс', 'Поля — почти всегда'],
  ['(нет модификатора) — <dfn>package-private</dfn>', 'Классы того же пакета', 'Внутренние детали модуля/фичи'],
  ['<code>protected</code>', 'Пакет + наследники', 'Редко, для расширяемых базовых классов'],
  ['<code>public</code>', 'Все', 'API класса: конструкторы, методы']
])}
<p><dfn>Encapsulation</dfn> (инкапсуляция): поля закрыты (<code>private</code>), наружу торчат методы. Это позволяет добавить валидацию, не ломая вызывающий код:</p>
${java`
public void setName(String name) {
    if (name == null || name.isBlank()) {
        throw new IllegalArgumentException("name must not be blank");
    }
    this.name = name;
}`}
<h3>Геттеры и сеттеры</h3>
<p>В Java принято писать методы доступа <code>getX()</code>/<code>setX()</code> (для boolean — <code>isX()</code>). Это соглашение <dfn>JavaBeans</dfn>: по нему библиотеки (Jackson для JSON, Hibernate для БД) находят свойства объекта. Писать их руками не нужно — в IDEA <kbd>Alt</kbd>+<kbd>Insert</kbd> → Getter and Setter. Сеттер стоит делать только для того, что действительно должно меняться.</p>
${info(`<p>Ты встретишь библиотеку <dfn>Lombok</dfn>: аннотации <code>@Getter</code>, <code>@Setter</code>, <code>@Data</code> генерируют этот код при компиляции. Она популярна, но в современной Java многие задачи закрывают <b>records</b> (следующий урок), поэтому в курсе мы обходимся без Lombok.</p>`)}

<h2>static — принадлежит классу</h2>
${java`
public class Order {
    private static long counter = 0;           // одно на все объекты
    public static final int MAX_ITEMS = 50;    // константа

    private final long number;

    public Order() {
        counter++;
        this.number = counter;
    }

    public static long createdCount() {        // вызывается как Order.createdCount()
        return counter;
    }
}`}
<p><code>static</code>-метод не имеет <code>this</code> и не видит обычные поля. Типичное применение: константы, утилиты (<code>Math.max</code>), фабричные методы (<code>List.of(...)</code>).</p>

<h2>final</h2>
<ul>
  <li><b>final-поле</b> — присваивается ровно один раз (в объявлении или конструкторе). Делай поля <code>final</code> везде, где можно — неизменяемые объекты проще и безопаснее в многопоточном коде.</li>
  <li><b>final-класс</b> — от него нельзя наследоваться (<code>String</code> — final).</li>
  <li><b>final-метод</b> — нельзя переопределить.</li>
</ul>

<h2>toString, equals, hashCode</h2>
<p>Все классы неявно наследуются от <code>Object</code>, у которого есть три важных метода:</p>
${java`
import java.util.Objects;

public class Point {
    private final int x;
    private final int y;

    public Point(int x, int y) { this.x = x; this.y = y; }

    @Override
    public String toString() {             // как объект печатается
        return "Point(" + x + ", " + y + ")";
    }

    @Override
    public boolean equals(Object o) {      // логическое равенство
        if (this == o) return true;
        if (!(o instanceof Point other)) return false;
        return x == other.x && y == other.y;
    }

    @Override
    public int hashCode() {                // для HashMap/HashSet
        return Objects.hash(x, y);
    }
}`}
<ul>
  <li>Без <code>toString</code> печатается что-то вроде <code>Point@1b6d3586</code>.</li>
  <li>Без <code>equals</code> два объекта с одинаковыми полями не равны — сравниваются ссылки.</li>
  <li><b>Правило:</b> переопределил <code>equals</code> — обязательно переопредели <code>hashCode</code>, иначе объект «потеряется» в <code>HashSet</code>/<code>HashMap</code>.</li>
  <li><code>@Override</code> — аннотация, просящая компилятор проверить, что метод действительно переопределяет родительский (защита от опечатки в имени).</li>
</ul>
${tip(`<p>Генерировать это руками не нужно: <kbd>Alt</kbd>+<kbd>Insert</kbd> → equals() and hashCode(). А для классов-«данных» в следующем уроке будут records, где всё это есть автоматически.</p>`)}

<h2>Объекты и ссылки</h2>
${java`
User a = new User(1, "Аня", "a@x.ru");
User b = a;            // копия ссылки, а не объекта
b.setName("Анна");
System.out.println(a.getName());   // "Анна" — как в JS`}
<p>Сборщик мусора (<dfn>Garbage Collector</dfn>, GC) удаляет объекты, на которые нет ссылок, — как в JS, управлять памятью вручную не нужно.</p>
`,
      tasks: [
        {
          title: 'Банковский счёт',
          text: `<p>Создай класс <code>BankAccount</code>: поля <code>owner</code> (неизменяемое) и <code>balance</code> (<code>BigDecimal</code>). Методы <code>deposit(BigDecimal)</code>, <code>withdraw(BigDecimal)</code> (бросает <code>IllegalStateException</code>, если денег не хватает), <code>getBalance()</code>. Сумма должна быть положительной — иначе <code>IllegalArgumentException</code>. Переопредели <code>toString</code>.</p>`,
          solution: java`
            import java.math.BigDecimal;

            public class BankAccount {
                private final String owner;
                private BigDecimal balance = BigDecimal.ZERO;

                public BankAccount(String owner) {
                    this.owner = owner;
                }

                public void deposit(BigDecimal amount) {
                    requirePositive(amount);
                    balance = balance.add(amount);
                }

                public void withdraw(BigDecimal amount) {
                    requirePositive(amount);
                    if (balance.compareTo(amount) < 0) {
                        throw new IllegalStateException("Недостаточно средств");
                    }
                    balance = balance.subtract(amount);
                }

                public BigDecimal getBalance() { return balance; }
                public String getOwner() { return owner; }

                private static void requirePositive(BigDecimal amount) {
                    if (amount == null || amount.signum() <= 0) {
                        throw new IllegalArgumentException("Сумма должна быть > 0");
                    }
                }

                @Override
                public String toString() {
                    return "BankAccount{owner='" + owner + "', balance=" + balance + "}";
                }
            }`
        },
        {
          title: 'Equals в деле',
          text: `<p>Создай класс <code>Email</code> с одним полем <code>value</code>, который нормализует адрес (обрезает пробелы, переводит в нижний регистр) в конструкторе. Сделай так, чтобы <code>new Email(" A@X.ru ").equals(new Email("a@x.ru"))</code> было <code>true</code> и оба объекта считались одним элементом в <code>HashSet</code>.</p>`,
          solution: java`
            import java.util.Objects;

            public final class Email {
                private final String value;

                public Email(String raw) {
                    if (raw == null || !raw.contains("@")) {
                        throw new IllegalArgumentException("Invalid email: " + raw);
                    }
                    this.value = raw.strip().toLowerCase();
                }

                public String value() { return value; }

                @Override
                public boolean equals(Object o) {
                    return o instanceof Email other && value.equals(other.value);
                }

                @Override
                public int hashCode() { return Objects.hash(value); }

                @Override
                public String toString() { return value; }
            }`
        }
      ],
      quiz: [
        { q: 'Какой модификатор обычно у полей класса?', options: ['public', 'private', 'protected', 'static'], answer: 1, explain: 'Поля скрываются, доступ — через методы. Это инкапсуляция.' },
        { q: 'Что будет, если переопределить <code>equals</code>, но не <code>hashCode</code>?', options: ['Ничего', 'Ошибка компиляции', 'Равные объекты могут не находиться в HashSet/HashMap', 'equals перестанет работать'], answer: 2, explain: 'Хэш-коллекции сначала смотрят на hashCode. Равные объекты обязаны иметь равные hashCode.' },
        { q: 'Можно ли из <code>static</code>-метода обратиться к обычному полю <code>this.name</code>?', options: ['Да', 'Нет, у static-метода нет this', 'Только если поле public', 'Только через var'], answer: 1, explain: 'static-метод принадлежит классу, а не конкретному объекту.' },
        { q: 'Зачем <code>@Override</code>?', options: ['Без неё метод не переопределится', 'Компилятор проверит, что метод действительно переопределяет родительский', 'Делает метод публичным', 'Для Spring'], answer: 1, explain: 'Аннотация защищает от опечаток: если такого метода у родителя нет — ошибка компиляции.' }
      ]
    },

    {
      id: 'inheritance-interfaces',
      title: 'Наследование, интерфейсы, records, enum',
      minutes: 45,
      goals: [
        'использовать наследование и абстрактные классы',
        'проектировать через интерфейсы (и понять номинальную типизацию)',
        'описывать данные через <code>record</code>',
        'применять <code>enum</code> и <code>sealed</code>-иерархии с pattern matching'
      ],
      body: `
<h2>Наследование</h2>
${java`
public abstract class Notification {
    protected final String recipient;

    protected Notification(String recipient) {
        this.recipient = recipient;
    }

    public abstract void send(String text);   // реализуют наследники

    public void sendAll(java.util.List<String> texts) {
        for (String t : texts) send(t);
    }
}

public class EmailNotification extends Notification {
    public EmailNotification(String email) {
        super(email);                          // вызов конструктора родителя
    }

    @Override
    public void send(String text) {
        System.out.println("Email to " + recipient + ": " + text);
    }
}`}
<ul>
  <li><code>extends</code> — наследование, <b>только от одного</b> класса (как в JS).</li>
  <li><code>super(...)</code> — вызов конструктора родителя, первой строкой.</li>
  <li><dfn>abstract class</dfn> — нельзя создать через <code>new</code>; может содержать абстрактные методы без тела.</li>
</ul>
${tip(`<p>В современном коде (и особенно в Spring) наследование реализации используется редко. Предпочитают <b>композицию</b> и <b>интерфейсы</b>.</p>`)}

<h2>Интерфейсы</h2>
<p><dfn>Interface</dfn> — контракт: набор методов, которые класс обязуется реализовать. Класс может реализовать <b>несколько</b> интерфейсов.</p>
${cmp(ts`
interface PaymentGateway {
  charge(amount: number): string;
}

// TS: структурная типизация —
// подходит любой объект с методом charge
const fake = {
  charge: (a: number) => "ok"
};
const g: PaymentGateway = fake; // OK`, java`
public interface PaymentGateway {
    String charge(BigDecimal amount);
}

// Java: номинальная типизация —
// нужно явно сказать implements
public class StripeGateway implements PaymentGateway {
    @Override
    public String charge(BigDecimal amount) {
        return "ch_123";
    }
}

PaymentGateway g = new StripeGateway();`, 'TypeScript', 'Java')}
<p>Интерфейс может содержать <code>default</code>-методы с реализацией и <code>static</code>-методы:</p>
${java`
public interface Discount {
    BigDecimal apply(BigDecimal price);

    default Discount andThen(Discount next) {
        return price -> next.apply(this.apply(price));
    }

    static Discount none() {
        return price -> price;
    }
}`}
<h3>Полиморфизм</h3>
<p>Переменная типа интерфейса может указывать на любой реализующий объект; вызывается метод реального объекта. Именно так работает Spring: <b>сервис зависит от интерфейса</b>, а конкретная реализация подставляется снаружи.</p>
${java`
public class CheckoutService {
    private final PaymentGateway gateway;    // не знает, Stripe это или заглушка

    public CheckoutService(PaymentGateway gateway) {
        this.gateway = gateway;
    }

    public String pay(BigDecimal amount) {
        return gateway.charge(amount);
    }
}`}

<h2>Records — классы-данные</h2>
<p><dfn>record</dfn> (Java 16+) — компактное объявление неизменяемого класса с данными. Компилятор сам генерирует конструктор, методы доступа, <code>equals</code>, <code>hashCode</code> и <code>toString</code>. Идеально для DTO, событий, value objects.</p>
${cmp(ts`
type Money = {
  readonly amount: number;
  readonly currency: string;
};

const m = { amount: 10, currency: "RUB" };`, java`
public record Money(BigDecimal amount, String currency) {}

var m = new Money(new BigDecimal("10"), "RUB");
m.amount();      // геттер без префикса get
m.currency();
m.equals(new Money(new BigDecimal("10"), "RUB")); // true
System.out.println(m); // Money[amount=10, currency=RUB]`, 'TypeScript', 'Java')}
<p>В record можно добавлять валидацию (<dfn>compact constructor</dfn>), методы и статические фабрики:</p>
${java`
public record Money(BigDecimal amount, String currency) {
    public Money {                                   // компактный конструктор
        if (amount.signum() < 0) throw new IllegalArgumentException("negative");
        currency = currency.toUpperCase();          // можно нормализовать
    }

    public static Money rub(String amount) {
        return new Money(new BigDecimal(amount), "RUB");
    }

    public Money plus(Money other) {
        if (!currency.equals(other.currency)) throw new IllegalArgumentException("currency mismatch");
        return new Money(amount.add(other.amount), currency);   // новый объект, а не изменение
    }
}`}
${info(`<p>Поля record всегда <code>private final</code>; сеттеров нет. Нужен «изменённый» объект — создаёшь новый. Ограничение: record нельзя наследовать, и он не подходит для JPA-сущностей (модуль 7).</p>`)}

<h2>Enum</h2>
<p>В TS <code>enum</code> или union-тип строк. В Java <dfn>enum</dfn> — полноценный класс с фиксированным набором экземпляров, у которого могут быть поля и методы.</p>
${java`
public enum OrderStatus {
    NEW("Новый"),
    PAID("Оплачен"),
    SHIPPED("Отправлен"),
    CANCELLED("Отменён");

    private final String title;

    OrderStatus(String title) { this.title = title; }

    public String title() { return title; }

    public boolean canCancel() {
        return this == NEW || this == PAID;   // enum можно сравнивать через ==
    }
}

OrderStatus s = OrderStatus.valueOf("PAID");  // из строки
s.name();       // "PAID"
s.canCancel();  // true
for (OrderStatus st : OrderStatus.values()) { ... }`}

<h2>Sealed-иерархии и pattern matching</h2>
<p><dfn>sealed</dfn> (Java 17+) ограничивает, кто может реализовать интерфейс. Вместе с record и switch получаются «алгебраические типы», как discriminated unions в TypeScript:</p>
${cmp(ts`
type Shape =
  | { kind: "circle"; r: number }
  | { kind: "square"; side: number };

function area(s: Shape): number {
  switch (s.kind) {
    case "circle": return Math.PI * s.r ** 2;
    case "square": return s.side ** 2;
  }
}`, java`
sealed interface Shape permits Circle, Square {}
record Circle(double r) implements Shape {}
record Square(double side) implements Shape {}

static double area(Shape s) {
    return switch (s) {
        case Circle c -> Math.PI * c.r() * c.r();
        case Square(double side) -> side * side; // деструктуризация
    };   // default не нужен: компилятор знает все варианты
}`, 'TypeScript', 'Java')}
<p>Если добавить новый тип в <code>permits</code>, компилятор укажет все switch, которые нужно дополнить.</p>
<h3>instanceof с переменной</h3>
${java`
if (obj instanceof String s && !s.isBlank()) {
    System.out.println(s.toUpperCase());   // s уже типа String, cast не нужен
}`}
`,
      tasks: [
        {
          title: 'Уведомления',
          text: `<p>Создай интерфейс <code>Notifier</code> с методом <code>void send(String userId, String message)</code> и две реализации: <code>ConsoleNotifier</code> (печатает в консоль) и <code>CollectingNotifier</code> (складывает сообщения в список, есть метод <code>sent()</code>). Напиши класс <code>OrderService</code>, принимающий <code>Notifier</code> в конструкторе, с методом <code>placeOrder(String userId)</code>, который уведомляет пользователя. В <code>main</code> проверь обе реализации.</p><p>Это тот же приём, на котором построено внедрение зависимостей в Spring и подмена зависимостей в тестах.</p>`,
          solution: java`
            import java.util.ArrayList;
            import java.util.List;

            interface Notifier {
                void send(String userId, String message);
            }

            class ConsoleNotifier implements Notifier {
                @Override
                public void send(String userId, String message) {
                    System.out.println("[" + userId + "] " + message);
                }
            }

            class CollectingNotifier implements Notifier {
                private final List<String> sent = new ArrayList<>();

                @Override
                public void send(String userId, String message) {
                    sent.add(userId + ": " + message);
                }

                public List<String> sent() { return sent; }
            }

            class OrderService {
                private final Notifier notifier;

                OrderService(Notifier notifier) { this.notifier = notifier; }

                void placeOrder(String userId) {
                    // ... логика заказа
                    notifier.send(userId, "Заказ оформлен");
                }
            }

            public class Main {
                public static void main(String[] args) {
                    new OrderService(new ConsoleNotifier()).placeOrder("u1");

                    var collecting = new CollectingNotifier();
                    new OrderService(collecting).placeOrder("u2");
                    System.out.println(collecting.sent()); // [u2: Заказ оформлен]
                }
            }`
        },
        {
          title: 'Результат платежа',
          text: `<p>Опиши sealed-интерфейс <code>PaymentResult</code> с тремя record-вариантами: <code>Success(String transactionId)</code>, <code>Declined(String reason)</code>, <code>Error(Exception cause)</code>. Напиши метод <code>String message(PaymentResult r)</code> на switch с паттернами без <code>default</code>.</p>`,
          solution: java`
            sealed interface PaymentResult permits Success, Declined, Error {}
            record Success(String transactionId) implements PaymentResult {}
            record Declined(String reason) implements PaymentResult {}
            record Error(Exception cause) implements PaymentResult {}

            static String message(PaymentResult r) {
                return switch (r) {
                    case Success s -> "Оплачено, транзакция " + s.transactionId();
                    case Declined(String reason) -> "Отклонено: " + reason;
                    case Error e -> "Ошибка: " + e.cause().getMessage();
                };
            }`
        }
      ],
      quiz: [
        { q: 'Сколько интерфейсов может реализовать класс?', options: ['Один', 'Два', 'Сколько угодно', 'Ни одного, если есть extends'], answer: 2, explain: 'Наследоваться можно от одного класса, а реализовывать — любое число интерфейсов.' },
        { q: 'Объект подходит под интерфейс Java, если…', options: ['у него есть все нужные методы', 'его класс явно объявил implements этого интерфейса', 'он record', 'он public'], answer: 1, explain: 'Типизация номинальная: важно явное объявление, а не «форма» объекта.' },
        { q: 'Что НЕ генерирует компилятор для record?', options: ['equals/hashCode', 'toString', 'Сеттеры', 'Методы доступа к полям'], answer: 2, explain: 'Record неизменяем, сеттеров нет.' },
        { q: 'Как получить геттер поля <code>amount</code> у record?', options: ['m.getAmount()', 'm.amount()', 'm.amount', 'm.get("amount")'], answer: 1, explain: 'У record методы доступа называются как поля, без get.' },
        { q: 'Зачем <code>sealed</code> + switch без default?', options: ['Для скорости', 'Компилятор проверит, что обработаны все варианты', 'Чтобы класс нельзя было создать', 'Так требует Spring'], answer: 1, explain: 'Exhaustiveness check: добавишь новый вариант — компилятор покажет, где его не обработали.' }
      ]
    },

    {
      id: 'exceptions',
      title: 'Исключения',
      minutes: 30,
      goals: [
        'понимать иерархию исключений и разницу checked/unchecked',
        'использовать try/catch/finally и try-with-resources',
        'создавать собственные исключения для бизнес-ошибок',
        'знать, какие практики приняты в Spring-приложениях'
      ],
      body: `
<h2>Основы: как в JS, но с типами</h2>
${cmp(js`
try {
  const data = JSON.parse(input);
} catch (e) {
  if (e instanceof SyntaxError) {
    console.error("Плохой JSON");
  } else {
    throw e;
  }
} finally {
  cleanup();
}`, java`
try {
    int n = Integer.parseInt(input);
} catch (NumberFormatException e) {
    System.err.println("Не число: " + e.getMessage());
} catch (IllegalStateException | IllegalArgumentException e) {
    // multi-catch
} finally {
    cleanup();
}`)}
<p>В Java <code>catch</code> сразу фильтрует по типу — <code>instanceof</code> внутри не нужен. Блоки проверяются сверху вниз, поэтому более конкретные типы пишут выше.</p>

<h2>Иерархия</h2>
${tree`
Throwable
├── Error                     — сбои JVM (OutOfMemoryError), не ловим
└── Exception                 — checked: компилятор требует обработать
    ├── IOException, SQLException, ...
    └── RuntimeException      — unchecked: обрабатывать не обязательно
        ├── NullPointerException
        ├── IllegalArgumentException
        ├── IllegalStateException
        └── ... твои бизнес-исключения`}

<h2>Checked vs unchecked</h2>
<p>Уникальная особенность Java. <dfn>Checked exceptions</dfn> (проверяемые) — наследники <code>Exception</code>, но не <code>RuntimeException</code>. Компилятор заставляет либо поймать их, либо объявить в сигнатуре через <code>throws</code>:</p>
${java`
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

// Вариант 1: пробросить выше — объявить в сигнатуре
static String readConfig() throws IOException {
    return Files.readString(Path.of("config.txt"));
}

// Вариант 2: обработать на месте
static String readConfigOrDefault() {
    try {
        return Files.readString(Path.of("config.txt"));
    } catch (IOException e) {
        return "{}";
    }
}`}
<p><dfn>Unchecked exceptions</dfn> (непроверяемые, <code>RuntimeException</code> и наследники) можно не объявлять и не ловить — как любые ошибки в JS.</p>
${info(`<p><b>Как поступают на практике:</b> в Spring-приложениях почти все исключения — unchecked. Spring сам заворачивает checked-ошибки JDBC в свои unchecked (<code>DataAccessException</code>). Свои бизнес-исключения наследуй от <code>RuntimeException</code>. Checked-исключение из библиотеки, которое ты не можешь осмысленно обработать, — заворачивай в unchecked, сохраняя причину (<dfn>cause</dfn>).</p>`)}
${java`
try {
    return Files.readString(path);
} catch (IOException e) {
    throw new UncheckedIOException("Не удалось прочитать " + path, e);  // e — cause
}`}

<h2>Свои исключения</h2>
${java`
public class NotFoundException extends RuntimeException {
    public NotFoundException(String message) {
        super(message);
    }

    public static NotFoundException user(long id) {
        return new NotFoundException("User " + id + " not found");
    }
}

public class BusinessRuleException extends RuntimeException {
    public BusinessRuleException(String message) {
        super(message);
    }
}

// использование
User user = users.get(id);
if (user == null) throw NotFoundException.user(id);`}
<p>Позже (модуль 6) ты научишься превращать такие исключения в HTTP-ответы 404/409 в одном месте — как error-middleware в Express.</p>

<h2>try-with-resources</h2>
<p>Ресурсы (файлы, соединения, потоки) нужно закрывать. Вместо <code>finally { res.close() }</code> используется <dfn>try-with-resources</dfn>: всё, что объявлено в скобках и реализует <code>AutoCloseable</code>, закроется автоматически, даже при исключении.</p>
${java`
try (var reader = Files.newBufferedReader(Path.of("data.csv"));
     var writer = Files.newBufferedWriter(Path.of("out.csv"))) {
    String line;
    while ((line = reader.readLine()) != null) {
        writer.write(line.toUpperCase());
        writer.newLine();
    }
} // reader и writer закрыты здесь, в обратном порядке`}
${node(`<p>Ближайший аналог — <code>await using</code> из новых версий JS/TS или паттерн <code>try/finally</code> с <code>stream.close()</code>. В Spring-коде ты будешь редко управлять ресурсами вручную: соединениями с БД управляет пул, транзакциями — Spring.</p>`)}

<h2>Хорошие и плохие практики</h2>
${table(['Плохо', 'Хорошо'], [
  ['<code>catch (Exception e) {}</code> — проглотить ошибку', 'Обработать осмысленно или пробросить дальше'],
  ['<code>e.printStackTrace()</code>', 'Залогировать логгером: <code>log.error("msg", e)</code>'],
  ['<code>throw new RuntimeException(e.getMessage())</code>', '<code>throw new XxxException("контекст", e)</code> — сохранять cause'],
  ['Ловить <code>NullPointerException</code>', 'Не допускать null: проверки, Optional'],
  ['Исключения для обычного потока управления', 'Исключения — для исключительных ситуаций'],
  ['Свой код бросает <code>Exception</code>', 'Конкретный тип: <code>IllegalArgumentException</code>, своё исключение']
])}
<p>Стандартные исключения, которые стоит переиспользовать: <code>IllegalArgumentException</code> — некорректный аргумент, <code>IllegalStateException</code> — объект в неподходящем состоянии, <code>UnsupportedOperationException</code> — операция не поддерживается.</p>
`,
      tasks: [
        {
          title: 'Парсер возраста',
          text: `<p>Напиши метод <code>int parseAge(String input)</code>: бросает <code>IllegalArgumentException</code> с понятным сообщением, если строка пустая, не число (поймай <code>NumberFormatException</code> и заверни, сохранив cause) или возраст вне диапазона 0..150.</p>`,
          solution: java`
            static int parseAge(String input) {
                if (input == null || input.isBlank()) {
                    throw new IllegalArgumentException("Возраст не указан");
                }
                int age;
                try {
                    age = Integer.parseInt(input.strip());
                } catch (NumberFormatException e) {
                    throw new IllegalArgumentException("Возраст должен быть числом: " + input, e);
                }
                if (age < 0 || age > 150) {
                    throw new IllegalArgumentException("Возраст вне диапазона: " + age);
                }
                return age;
            }`
        },
        {
          title: 'Сервис со своими исключениями',
          text: `<p>Создай <code>InMemoryUserStore</code> с методами <code>add(String email)</code> и <code>get(String email)</code>. Если email уже есть — <code>DuplicateEmailException</code>, если не найден — <code>UserNotFoundException</code>. Оба — unchecked. Для хранения используй <code>java.util.HashSet&lt;String&gt;</code>.</p>`,
          solution: java`
            import java.util.HashSet;
            import java.util.Set;

            class DuplicateEmailException extends RuntimeException {
                DuplicateEmailException(String email) { super("Email already used: " + email); }
            }

            class UserNotFoundException extends RuntimeException {
                UserNotFoundException(String email) { super("User not found: " + email); }
            }

            class InMemoryUserStore {
                private final Set<String> emails = new HashSet<>();

                void add(String email) {
                    if (!emails.add(email)) {          // add возвращает false, если элемент уже был
                        throw new DuplicateEmailException(email);
                    }
                }

                String get(String email) {
                    if (!emails.contains(email)) throw new UserNotFoundException(email);
                    return email;
                }
            }`
        }
      ],
      quiz: [
        { q: 'Какое исключение компилятор заставит обработать или объявить?', options: ['NullPointerException', 'IllegalArgumentException', 'IOException', 'ArithmeticException'], answer: 2, explain: 'IOException — checked (наследник Exception, но не RuntimeException).' },
        { q: 'От чего наследовать бизнес-исключения в Spring-приложении?', options: ['Exception', 'Error', 'RuntimeException', 'Throwable'], answer: 2, explain: 'Unchecked-исключения не загромождают сигнатуры, и @Transactional по умолчанию откатывает транзакцию именно на них.' },
        { q: 'Что гарантирует try-with-resources?', options: ['Что исключения не будет', 'Автоматический вызов close() у ресурсов', 'Повтор операции при ошибке', 'Асинхронное выполнение'], answer: 1, explain: 'Ресурсы, реализующие AutoCloseable, закрываются при выходе из блока в любом случае.' },
        { q: 'Зачем передавать <code>e</code> вторым аргументом в конструктор нового исключения?', options: ['Для красоты', 'Чтобы сохранить исходную причину и её стек вызовов', 'Иначе не скомпилируется', 'Чтобы исключение стало checked'], answer: 1, explain: 'Cause попадёт в лог как "Caused by: ..." — без неё отладка сильно сложнее.' }
      ]
    }
  ]
});
