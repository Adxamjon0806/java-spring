COURSE.addModule({
  id: 'm3',
  title: 'Java: продвинутый уровень',
  description: 'Generics, коллекции, лямбды и Stream API вместо map/filter/reduce, Optional, многопоточность и CompletableFuture вместо Promise.',
  lessons: [
    {
      id: 'generics',
      title: 'Generics',
      minutes: 25,
      goals: [
        'писать обобщённые классы и методы',
        'использовать ограничения <code>extends</code> и wildcard-типы',
        'понимать type erasure и его последствия'
      ],
      body: `
<p><dfn>Generics</dfn> (обобщённые типы) — параметры-типы, как в TypeScript. Ты их уже видел: <code>List&lt;String&gt;</code>. Синтаксис почти тот же.</p>

<h2>Обобщённый класс и метод</h2>
${cmp(ts`
class Box<T> {
  constructor(readonly value: T) {}

  map<R>(fn: (v: T) => R): Box<R> {
    return new Box(fn(this.value));
  }
}

function first<T>(items: T[]): T | undefined {
  return items[0];
}`, java`
public class Box<T> {
    private final T value;

    public Box(T value) { this.value = value; }

    public T get() { return value; }

    public <R> Box<R> map(Function<T, R> fn) {
        return new Box<>(fn.apply(value));
    }
}

public static <T> T first(List<T> items) {
    return items.isEmpty() ? null : items.get(0);
}`, 'TypeScript', 'Java')}
<ul>
  <li>У обобщённого метода параметр-тип объявляется <b>перед</b> возвращаемым типом: <code>public static &lt;T&gt; T first(...)</code>.</li>
  <li><code>new Box&lt;&gt;(...)</code> — «ромб» (<dfn>diamond operator</dfn>): тип выводится из контекста.</li>
  <li>Параметром-типом может быть только ссылочный тип: <code>Box&lt;Integer&gt;</code>, но не <code>Box&lt;int&gt;</code>.</li>
</ul>

<h2>Ограничения (bounded types)</h2>
${cmp(ts`
function max<T extends { compareTo(o: T): number }>(
  items: T[]
): T { ... }`, java`
public static <T extends Comparable<T>> T max(List<T> items) {
    T best = items.get(0);
    for (T item : items) {
        if (item.compareTo(best) > 0) best = item;
    }
    return best;
}

max(List.of(3, 9, 2));         // 9
max(List.of("b", "a", "c"));   // "c"`, 'TypeScript', 'Java')}

<h2>Wildcards: ? extends и ? super</h2>
<p>Неочевидная вещь: <code>List&lt;Integer&gt;</code> <b>не является</b> подтипом <code>List&lt;Number&gt;</code>, хотя <code>Integer</code> — подтип <code>Number</code>. Иначе можно было бы положить <code>Double</code> в список целых. Для гибкости есть <dfn>wildcards</dfn>:</p>
${java`
// читаем элементы как Number — подходит List<Integer>, List<Double>...
static double sum(List<? extends Number> nums) {
    double total = 0;
    for (Number n : nums) total += n.doubleValue();
    return total;
}

// кладём Integer — подходит List<Integer>, List<Number>, List<Object>
static void fillWithZeros(List<? super Integer> target, int count) {
    for (int i = 0; i < count; i++) target.add(0);
}`}
<p>Мнемоника <dfn>PECS</dfn>: <b>P</b>roducer <b>E</b>xtends, <b>C</b>onsumer <b>S</b>uper. Если коллекция <i>отдаёт</i> элементы — <code>extends</code>, если <i>принимает</i> — <code>super</code>. Писать такое самому приходится нечасто, но в сигнатурах стандартной библиотеки и Spring ты это увидишь постоянно.</p>

<h2>Type erasure</h2>
<p>Как и в TypeScript, информация о параметрах-типах <b>стирается</b> при компиляции (<dfn>type erasure</dfn>): в рантайме <code>List&lt;String&gt;</code> и <code>List&lt;Integer&gt;</code> — один класс <code>List</code>. Последствия:</p>
<ul>
  <li>нельзя написать <code>new T()</code> или <code>new T[10]</code>;</li>
  <li>нельзя проверить <code>obj instanceof List&lt;String&gt;</code>;</li>
  <li>поэтому библиотеки часто просят передать класс явно: <code>objectMapper.readValue(json, User.class)</code>.</li>
</ul>
${warn(`<p>Никогда не используй <dfn>raw types</dfn> — обобщённые типы без параметра: <code>List list = new ArrayList();</code>. Это наследие Java 1.4, компилятор перестаёт проверять типы. IDE подсветит такое предупреждением.</p>`)}
`,
      tasks: [
        {
          title: 'Pair',
          text: `<p>Создай обобщённый record <code>Pair&lt;A, B&gt;</code> с методами <code>swap()</code> (возвращает <code>Pair&lt;B, A&gt;</code>) и <code>mapFirst(Function&lt;A, C&gt;)</code>. Подсказка: обобщённый метод в record объявляется так же, как в классе.</p>`,
          solution: java`
            import java.util.function.Function;

            public record Pair<A, B>(A first, B second) {
                public Pair<B, A> swap() {
                    return new Pair<>(second, first);
                }

                public <C> Pair<C, B> mapFirst(Function<A, C> fn) {
                    return new Pair<>(fn.apply(first), second);
                }
            }

            // var p = new Pair<>("age", 30);
            // p.swap()                  -> Pair[first=30, second=age]
            // p.mapFirst(String::length) -> Pair[first=3, second=30]`
        }
      ],
      quiz: [
        { q: 'Можно ли написать <code>List&lt;int&gt;</code>?', options: ['Да', 'Нет, только List&lt;Integer&gt;', 'Только с var', 'Только в Java 21'], answer: 1, explain: 'Параметр-тип должен быть ссылочным типом.' },
        { q: 'Является ли <code>List&lt;Integer&gt;</code> подтипом <code>List&lt;Number&gt;</code>?', options: ['Да', 'Нет', 'Только для чтения', 'Зависит от JVM'], answer: 1, explain: 'Generics инвариантны. Для гибкости используют List&lt;? extends Number&gt;.' },
        { q: 'Почему нельзя <code>new T()</code>?', options: ['Из-за type erasure: в рантайме T неизвестен', 'T может быть интерфейсом', 'Так решили авторы Spring', 'Можно'], answer: 0, explain: 'После компиляции информация о T стирается.' }
      ]
    },

    {
      id: 'collections',
      title: 'Collections Framework',
      minutes: 35,
      goals: [
        'выбирать между List, Set, Map и их реализациями',
        'перевести привычные операции JS-массивов и Map/объектов на Java',
        'создавать неизменяемые коллекции',
        'избегать типичных ошибок: изменение при обходе, ключи без equals/hashCode'
      ],
      body: `
<h2>Карта коллекций</h2>
${table(['JS', 'Java-интерфейс', 'Основная реализация', 'Особенности'], [
  ['<code>Array</code>', '<code>List&lt;E&gt;</code>', '<code>ArrayList</code>', 'Упорядочен, доступ по индексу, допускает дубликаты'],
  ['<code>Set</code>', '<code>Set&lt;E&gt;</code>', '<code>HashSet</code> / <code>LinkedHashSet</code> / <code>TreeSet</code>', 'Без дубликатов. Hash — без порядка, Linked — порядок вставки, Tree — отсортирован'],
  ['<code>Map</code>, объект-словарь', '<code>Map&lt;K,V&gt;</code>', '<code>HashMap</code> / <code>LinkedHashMap</code> / <code>TreeMap</code>', 'Ключ → значение, аналогично'],
  ['массив как очередь/стек', '<code>Deque&lt;E&gt;</code>', '<code>ArrayDeque</code>', 'push/pop/offer/poll с обоих концов']
])}
<p>Принято объявлять переменную <b>типом интерфейса</b>, а создавать конкретную реализацию: <code>List&lt;String&gt; names = new ArrayList&lt;&gt;();</code>. Так реализацию легко заменить.</p>

<h2>List</h2>
${cmp(js`
const names = ["Аня", "Боря"];
names.push("Вася");
names[0];
names.length;
names.includes("Боря");
names.indexOf("Вася");
names.splice(1, 1);
names.sort();
for (const n of names) { ... }
names.forEach(n => console.log(n));`, java`
List<String> names = new ArrayList<>(List.of("Аня", "Боря"));
names.add("Вася");
names.get(0);
names.size();
names.contains("Боря");
names.indexOf("Вася");
names.remove(1);                // по индексу
names.sort(Comparator.naturalOrder());
for (String n : names) { ... }
names.forEach(n -> System.out.println(n));`)}

<h2>Map</h2>
${cmp(js`
const stock = new Map();
stock.set("apple", 5);
stock.get("apple");           // 5
stock.get("pear");            // undefined
stock.has("apple");
stock.delete("apple");
stock.size;

for (const [k, v] of stock) { ... }

// подсчёт
counts[w] = (counts[w] || 0) + 1;`, java`
Map<String, Integer> stock = new HashMap<>();
stock.put("apple", 5);
stock.get("apple");                 // 5
stock.get("pear");                  // null
stock.containsKey("apple");
stock.remove("apple");
stock.size();

for (Map.Entry<String, Integer> e : stock.entrySet()) {
    String k = e.getKey(); Integer v = e.getValue();
}
stock.forEach((k, v) -> System.out.println(k + "=" + v));

// подсчёт
counts.merge(w, 1, Integer::sum);`)}
<p>Полезные методы <code>Map</code>, которые заменяют частые идиомы:</p>
${java`
stock.getOrDefault("pear", 0);                       // значение или дефолт
stock.putIfAbsent("pear", 0);                        // положить, если нет
stock.merge("apple", 3, Integer::sum);               // сложить со старым значением

// сгруппировать: Map<String, List<String>>
Map<String, List<String>> byLetter = new HashMap<>();
byLetter.computeIfAbsent("a", key -> new ArrayList<>()).add("apple");`}

<h2>Set</h2>
${java`
Set<String> tags = new HashSet<>();
tags.add("java");
tags.add("java");          // дубликат игнорируется, вернёт false
tags.contains("java");     // true

Set<String> a = new HashSet<>(Set.of("x", "y"));
a.retainAll(Set.of("y", "z"));   // пересечение -> [y]
a.addAll(Set.of("q"));           // объединение`}

<h2>Неизменяемые коллекции</h2>
<p>Фабрики <code>List.of</code>, <code>Set.of</code>, <code>Map.of</code> создают <dfn>immutable</dfn> (неизменяемые) коллекции. Попытка изменить — <code>UnsupportedOperationException</code>. Они же запрещают <code>null</code>.</p>
${java`
List<String> roles = List.of("USER", "ADMIN");
roles.add("GUEST");                      // UnsupportedOperationException!

Map<String, Integer> limits = Map.of("free", 10, "pro", 1000);

List<String> copy = new ArrayList<>(roles);  // изменяемая копия
List<String> frozen = List.copyOf(copy);     // неизменяемая копия`}
${tip(`<p>Возвращай из методов неизменяемые коллекции или копии — тогда никто снаружи не испортит внутреннее состояние объекта. Аналог <code>Object.freeze</code>, но работающий по-настоящему.</p>`)}

<h2>Сортировка и Comparator</h2>
${cmp(js`
users.sort((a, b) => a.age - b.age);
users.sort((a, b) =>
  a.city.localeCompare(b.city) || b.age - a.age);`, java`
users.sort(Comparator.comparingInt(User::age));
users.sort(Comparator.comparing(User::city)
        .thenComparing(User::age, Comparator.reverseOrder()));`)}
<p><code>User::age</code> — <dfn>method reference</dfn> (ссылка на метод), сокращение для <code>u -&gt; u.age()</code>. Подробнее — в следующем уроке.</p>

<h2>Типичные ошибки</h2>
${warn(`<p><b>Изменение коллекции во время обхода</b> через for-each бросает <code>ConcurrentModificationException</code>:</p>${java`
for (String n : names) {
    if (n.startsWith("A")) names.remove(n);   // ConcurrentModificationException
}
names.removeIf(n -> n.startsWith("A"));       // правильно`}`)}
${warn(`<p><b>Свой класс как ключ <code>HashMap</code> или элемент <code>HashSet</code></b> без <code>equals</code>/<code>hashCode</code> — объекты с одинаковыми полями будут разными ключами. Record решает это автоматически.</p>`)}
${warn(`<p><code>map.get(key)</code> возвращает <code>null</code>, если ключа нет. Распаковка в <code>int</code> даст NPE: <code>int n = map.get("x");</code>. Используй <code>getOrDefault</code>.</p>`)}
`,
      tasks: [
        {
          title: 'Частотный словарь',
          text: `<p>Дан текст. Посчитай, сколько раз встречается каждое слово (без учёта регистра), и выведи 3 самых частых. Используй <code>Map&lt;String, Integer&gt;</code> и <code>merge</code>, затем отсортируй <code>entrySet()</code>.</p>`,
          solution: java`
            import java.util.*;

            public class WordCount {
                public static void main(String[] args) {
                    String text = "Java это Java а Spring это Spring Boot и Java";
                    Map<String, Integer> counts = new HashMap<>();
                    for (String w : text.toLowerCase().split("\\s+")) {
                        counts.merge(w, 1, Integer::sum);
                    }

                    List<Map.Entry<String, Integer>> entries = new ArrayList<>(counts.entrySet());
                    entries.sort(Map.Entry.<String, Integer>comparingByValue().reversed());

                    for (var e : entries.subList(0, Math.min(3, entries.size()))) {
                        System.out.println(e.getKey() + ": " + e.getValue());
                    }
                }
            }`
        },
        {
          title: 'Корзина',
          text: `<p>Реализуй класс <code>Cart</code>: товары хранятся в <code>Map&lt;String, Integer&gt;</code> (артикул → количество) с сохранением порядка добавления. Методы: <code>add(sku, qty)</code>, <code>remove(sku)</code>, <code>quantity(sku)</code> (0 если нет), <code>items()</code> — возвращает неизменяемую копию.</p>`,
          solution: java`
            import java.util.Collections;
            import java.util.LinkedHashMap;
            import java.util.Map;

            public class Cart {
                private final Map<String, Integer> items = new LinkedHashMap<>();

                public void add(String sku, int qty) {
                    if (qty <= 0) throw new IllegalArgumentException("qty must be > 0");
                    items.merge(sku, qty, Integer::sum);
                }

                public void remove(String sku) {
                    items.remove(sku);
                }

                public int quantity(String sku) {
                    return items.getOrDefault(sku, 0);
                }

                public Map<String, Integer> items() {
                    // Map.copyOf тоже неизменяемая копия, но порядок не сохраняет
                    return Collections.unmodifiableMap(new LinkedHashMap<>(items));
                }
            }`
        }
      ],
      quiz: [
        { q: 'Какая реализация Map сохраняет порядок вставки?', options: ['HashMap', 'TreeMap', 'LinkedHashMap', 'Map.of'], answer: 2, explain: 'HashMap порядок не гарантирует, TreeMap сортирует по ключу.' },
        { q: 'Что вернёт <code>map.get("нет-такого")</code>?', options: ['undefined', 'null', 'Исключение', 'Пустую строку'], answer: 1, explain: 'Отсутствующий ключ → null. Безопаснее getOrDefault.' },
        { q: 'Что будет при <code>List.of(1, 2).add(3)</code>?', options: ['[1, 2, 3]', 'UnsupportedOperationException', 'Ошибка компиляции', 'Вернёт false'], answer: 1, explain: 'List.of создаёт неизменяемый список.' },
        { q: 'Как безопасно удалить элементы по условию?', options: ['for-each + remove', 'list.removeIf(predicate)', 'list.delete()', 'list.filter()'], answer: 1, explain: 'Удаление внутри for-each приводит к ConcurrentModificationException.' }
      ]
    },

    {
      id: 'lambdas-streams',
      title: 'Лямбды, Stream API и Optional',
      minutes: 45,
      goals: [
        'писать лямбды и ссылки на методы',
        'знать основные функциональные интерфейсы',
        'переводить цепочки <code>filter/map/reduce</code> на Stream API',
        'группировать данные через <code>Collectors</code>',
        'работать с <code>Optional</code> вместо <code>null</code>'
      ],
      body: `
<h2>Лямбды</h2>
<p><dfn>Lambda expression</dfn> — анонимная функция, как стрелочная функция в JS. Синтаксис: <code>-&gt;</code> вместо <code>=&gt;</code>.</p>
${cmp(js`
const double = x => x * 2;
const add = (a, b) => a + b;
const log = () => console.log("hi");
const process = (x) => {
  const y = x * 2;
  return y + 1;
};`, java`
Function<Integer, Integer> doubleIt = x -> x * 2;
BinaryOperator<Integer> add = (a, b) -> a + b;
Runnable log = () -> System.out.println("hi");
Function<Integer, Integer> process = x -> {
    int y = x * 2;
    return y + 1;
};`)}
<p>Но в Java нет отдельного типа «функция». Лямбда — это реализация <dfn>functional interface</dfn> (функционального интерфейса): интерфейса с ровно одним абстрактным методом. Тип лямбды определяется тем, куда её присваивают.</p>
${table(['Интерфейс', 'Сигнатура', 'Аналог в TS', 'Вызов'], [
  ['<code>Function&lt;T,R&gt;</code>', 'T → R', '<code>(t: T) =&gt; R</code>', '<code>f.apply(t)</code>'],
  ['<code>BiFunction&lt;T,U,R&gt;</code>', '(T, U) → R', '<code>(t: T, u: U) =&gt; R</code>', '<code>f.apply(t, u)</code>'],
  ['<code>Predicate&lt;T&gt;</code>', 'T → boolean', '<code>(t: T) =&gt; boolean</code>', '<code>p.test(t)</code>'],
  ['<code>Consumer&lt;T&gt;</code>', 'T → void', '<code>(t: T) =&gt; void</code>', '<code>c.accept(t)</code>'],
  ['<code>Supplier&lt;T&gt;</code>', '() → T', '<code>() =&gt; T</code>', '<code>s.get()</code>'],
  ['<code>Runnable</code>', '() → void', '<code>() =&gt; void</code>', '<code>r.run()</code>'],
  ['<code>UnaryOperator&lt;T&gt;</code>, <code>BinaryOperator&lt;T&gt;</code>', 'T → T, (T,T) → T', '', '<code>apply</code>']
])}
${warn(`<p>Лямбда может использовать внешние локальные переменные, только если они <dfn>effectively final</dfn> — не изменяются после присваивания. Счётчик <code>count++</code> внутри лямбды не скомпилируется. Это защита от гонок данных в многопоточном коде.</p>`)}

<h3>Ссылки на методы</h3>
${java`
Function<String, Integer> len = String::length;          // s -> s.length()
Consumer<String> print = System.out::println;            // s -> System.out.println(s)
Function<String, User> create = User::new;               // name -> new User(name)
BiFunction<Integer, Integer, Integer> max = Math::max;   // (a, b) -> Math.max(a, b)`}

<h2>Stream API</h2>
<p><dfn>Stream</dfn> — конвейер обработки последовательности элементов. Это не коллекция: он ленивый (<dfn>lazy</dfn> — ничего не вычисляется до терминальной операции) и одноразовый.</p>
${cmp(js`
const total = orders
  .filter(o => o.status === "PAID")
  .map(o => o.amount)
  .reduce((a, b) => a + b, 0);

const emails = users
  .filter(u => u.active)
  .map(u => u.email.toLowerCase());`, java`
BigDecimal total = orders.stream()
    .filter(o -> o.status() == OrderStatus.PAID)
    .map(Order::amount)
    .reduce(BigDecimal.ZERO, BigDecimal::add);

List<String> emails = users.stream()
    .filter(User::active)
    .map(u -> u.email().toLowerCase())
    .toList();               // Java 16+, неизменяемый список`)}
<p>Структура: <b>источник</b> (<code>.stream()</code>) → <b>промежуточные операции</b> (возвращают Stream) → <b>терминальная операция</b> (возвращает результат).</p>
${table(['JS', 'Stream API'], [
  ['<code>filter</code>', '<code>filter</code>'],
  ['<code>map</code>', '<code>map</code> (а для чисел — <code>mapToInt</code>, <code>mapToLong</code>)'],
  ['<code>flatMap</code>', '<code>flatMap(x -&gt; x.items().stream())</code>'],
  ['<code>reduce</code>', '<code>reduce</code>, или готовые <code>sum()</code>, <code>count()</code>, <code>max()</code>'],
  ['<code>find</code>', '<code>filter(...).findFirst()</code> → <code>Optional</code>'],
  ['<code>some</code> / <code>every</code>', '<code>anyMatch</code> / <code>allMatch</code> / <code>noneMatch</code>'],
  ['<code>slice(0, n)</code>', '<code>limit(n)</code>, <code>skip(n)</code>'],
  ['<code>[...new Set(arr)]</code>', '<code>distinct()</code>'],
  ['<code>sort</code>', '<code>sorted(Comparator.comparing(...))</code>'],
  ['<code>forEach</code>', '<code>forEach</code> (терминальная)'],
  ['<code>join(", ")</code>', '<code>collect(Collectors.joining(", "))</code>'],
  ['<code>Array.from({length: n}, (_, i) =&gt; i)</code>', '<code>IntStream.range(0, n)</code>']
])}
${java`
int totalQty = items.stream().mapToInt(Item::qty).sum();
boolean hasAdmin = users.stream().anyMatch(u -> u.role() == Role.ADMIN);
Optional<User> oldest = users.stream().max(Comparator.comparingInt(User::age));
List<String> allTags = posts.stream().flatMap(p -> p.tags().stream()).distinct().sorted().toList();
String csv = names.stream().collect(Collectors.joining(", ", "[", "]"));`}

<h2>Collectors: группировка и словари</h2>
<p>То, что в JS делается через <code>reduce</code> в объект или <code>Object.groupBy</code>, в Java — <code>Collectors</code>:</p>
${java`
import static java.util.stream.Collectors.*;

// Map<String, List<User>> — пользователи по городам
Map<String, List<User>> byCity = users.stream().collect(groupingBy(User::city));

// Map<String, Long> — количество по городам
Map<String, Long> countByCity = users.stream().collect(groupingBy(User::city, counting()));

// Map<Long, User> — индекс по id
Map<Long, User> byId = users.stream().collect(toMap(User::id, u -> u));

// Map<Boolean, List<User>> — разделить на две группы
Map<Boolean, List<User>> partition = users.stream().collect(partitioningBy(User::active));

// сумма по группам
Map<String, BigDecimal> revenueByCategory = orders.stream()
    .collect(groupingBy(Order::category, reducing(BigDecimal.ZERO, Order::amount, BigDecimal::add)));`}
${warn(`<p><code>toMap</code> бросит <code>IllegalStateException</code> при дубликате ключа. Если дубликаты возможны, передай третий аргумент — функцию слияния: <code>toMap(User::email, u -&gt; u, (a, b) -&gt; a)</code>.</p>`)}

<h2>Optional — явное «может не быть»</h2>
<p><dfn>Optional&lt;T&gt;</dfn> — контейнер, в котором значение либо есть, либо нет. Его возвращают методы, результат которых может отсутствовать (например, поиск в БД <code>findById</code>). Это замена <code>?.</code> и <code>??</code> из JS:</p>
${cmp(js`
const user = users.find(u => u.email === email);

const name = user?.name ?? "Гость";

if (!user) throw new NotFoundError();

const city = user?.address?.city;`, java`
Optional<User> user = users.stream()
    .filter(u -> u.email().equals(email))
    .findFirst();

String name = user.map(User::name).orElse("Гость");

User u = user.orElseThrow(() -> new NotFoundException(email));

Optional<String> city = user.map(User::address).map(Address::city);`)}
${table(['Метод', 'Что делает'], [
  ['<code>Optional.of(x)</code> / <code>ofNullable(x)</code> / <code>empty()</code>', 'Создать (of — x не null, ofNullable — может быть null)'],
  ['<code>isPresent()</code> / <code>isEmpty()</code>', 'Проверить наличие'],
  ['<code>map(f)</code>, <code>flatMap(f)</code>, <code>filter(p)</code>', 'Преобразовать, если значение есть'],
  ['<code>orElse(def)</code>', 'Значение или дефолт (дефолт вычисляется всегда)'],
  ['<code>orElseGet(() -&gt; ...)</code>', 'Значение или результат функции (лениво)'],
  ['<code>orElseThrow(() -&gt; ex)</code>', 'Значение или исключение — самый частый вариант в сервисах'],
  ['<code>ifPresent(c)</code>, <code>ifPresentOrElse(c, r)</code>', 'Выполнить действие']
])}
${tip(`<p>Правила хорошего тона: используй <code>Optional</code> как <b>возвращаемый тип</b>; не делай полей и параметров типа <code>Optional</code>; не вызывай <code>get()</code> без проверки — используй <code>orElseThrow()</code>.</p>`)}
`,
      tasks: [
        {
          title: 'Отчёт по заказам',
          text: `<p>Дано:</p>${java`
            enum Status { NEW, PAID, CANCELLED }
            record Order(long id, String customer, String category, BigDecimal amount, Status status) {}`}<p>Используя только Stream API, посчитай: (1) сумму всех оплаченных заказов; (2) выручку по категориям (только PAID); (3) топ-3 клиентов по сумме оплаченных заказов; (4) есть ли хотя бы один отменённый заказ дороже 10 000.</p>`,
          solution: java`
            import static java.util.stream.Collectors.*;

            List<Order> paid = orders.stream().filter(o -> o.status() == Status.PAID).toList();

            // 1
            BigDecimal total = paid.stream().map(Order::amount).reduce(BigDecimal.ZERO, BigDecimal::add);

            // 2
            Map<String, BigDecimal> byCategory = paid.stream()
                .collect(groupingBy(Order::category,
                         reducing(BigDecimal.ZERO, Order::amount, BigDecimal::add)));

            // 3
            List<String> topCustomers = paid.stream()
                .collect(groupingBy(Order::customer,
                         reducing(BigDecimal.ZERO, Order::amount, BigDecimal::add)))
                .entrySet().stream()
                .sorted(Map.Entry.<String, BigDecimal>comparingByValue().reversed())
                .limit(3)
                .map(Map.Entry::getKey)
                .toList();

            // 4
            boolean bigCancelled = orders.stream()
                .anyMatch(o -> o.status() == Status.CANCELLED
                            && o.amount().compareTo(new BigDecimal("10000")) > 0);`
        },
        {
          title: 'Optional-цепочка',
          text: `<p>Перепиши на <code>Optional</code> без единой проверки на <code>null</code>:</p>${java`
            String getManagerEmail(Employee e) {
                if (e != null && e.getDepartment() != null
                        && e.getDepartment().getManager() != null) {
                    return e.getDepartment().getManager().getEmail();
                }
                return "noreply@company.com";
            }`}`,
          solution: java`
            String getManagerEmail(Employee e) {
                return Optional.ofNullable(e)
                    .map(Employee::getDepartment)
                    .map(Department::getManager)
                    .map(Employee::getEmail)
                    .orElse("noreply@company.com");
            }`
        }
      ],
      quiz: [
        { q: 'Что такое функциональный интерфейс?', options: ['Интерфейс с аннотацией @Function', 'Интерфейс ровно с одним абстрактным методом', 'Любой интерфейс из java.util.function', 'Класс со static-методами'], answer: 1, explain: 'Лямбду можно присвоить любому интерфейсу с одним абстрактным методом.' },
        { q: 'Что выведет код: <code>Stream.of(1,2,3).map(x -&gt; { System.out.println(x); return x; });</code>?', options: ['1 2 3', 'Ничего: нет терминальной операции', '3 2 1', 'Ошибку'], answer: 1, explain: 'Стримы ленивые: без терминальной операции (toList, forEach...) ничего не выполнится.' },
        { q: 'Аналог <code>user?.name ?? "Гость"</code>:', options: ['user.name().orElse("Гость")', 'user.map(User::name).orElse("Гость")', 'user.get().name()', 'Optional.of(user.name())'], answer: 1, explain: 'map применяется, только если значение есть, orElse даёт дефолт.' },
        { q: 'Как сгруппировать список по полю?', options: ['stream().groupBy()', 'collect(Collectors.groupingBy(...))', 'Map.groupBy(list)', 'list.group()'], answer: 1, explain: 'Collectors.groupingBy возвращает Map&lt;K, List&lt;T&gt;&gt;.' },
        { q: 'Почему нельзя изменять внешний <code>int count</code> внутри лямбды?', options: ['Лямбды не видят внешние переменные', 'Захватываемые переменные должны быть effectively final', 'int нельзя использовать в лямбдах', 'Можно'], answer: 1, explain: 'Для подсчёта используй count() у стрима или AtomicInteger.' }
      ]
    },

    {
      id: 'concurrency',
      title: 'Многопоточность: от Promise к потокам',
      minutes: 40,
      goals: [
        'понимать, чем потоки Java отличаются от event loop',
        'запускать задачи через ExecutorService',
        'использовать CompletableFuture как аналог Promise',
        'видеть гонки данных и знать базовые способы защиты',
        'понимать, что дают virtual threads'
      ],
      body: `
<h2>Зачем это знать Spring-разработчику</h2>
<p>В Node твой код всегда выполняется в одном потоке, поэтому гонок данных в памяти не бывает. В Spring каждый HTTP-запрос обрабатывается <b>в своём потоке</b>, и все они работают одновременно с одними и теми же объектами-сервисами. Отсюда главное правило: <b>Spring-бины (сервисы, контроллеры) не должны хранить изменяемое состояние запроса в полях</b>. Нужно понимать, почему.</p>

<h2>Поток и пул потоков</h2>
<p><dfn>Thread</dfn> (поток) — независимая последовательность выполнения внутри процесса. Создавать потоки вручную через <code>new Thread()</code> почти не нужно — используют <dfn>ExecutorService</dfn> (пул потоков), которому отдают задачи:</p>
${java`
import java.util.concurrent.*;

ExecutorService pool = Executors.newFixedThreadPool(4);

Future<Integer> future = pool.submit(() -> {
    Thread.sleep(1000);          // имитация долгой работы
    return 42;
});

System.out.println("задача запущена, main продолжает работу");
Integer result = future.get();   // блокирует текущий поток до результата
pool.shutdown();`}
${node(`<p><code>Thread.sleep(1000)</code> действительно блокирует поток — в Node так нельзя, а в Java это нормально, пока блокируется <i>не единственный</i> поток. <code>future.get()</code> похож на <code>await</code>, но блокирует поток, а не «отпускает» event loop.</p>`)}

<h2>CompletableFuture — это Promise</h2>
${table(['Promise (JS)', 'CompletableFuture (Java)'], [
  ['<code>new Promise(...)</code>, <code>async () =&gt; ...</code>', '<code>CompletableFuture.supplyAsync(() -&gt; ...)</code>'],
  ['<code>Promise.resolve(x)</code>', '<code>CompletableFuture.completedFuture(x)</code>'],
  ['<code>.then(x =&gt; y)</code>', '<code>.thenApply(x -&gt; y)</code>'],
  ['<code>.then(x =&gt; fetchMore(x))</code> (вернул Promise)', '<code>.thenCompose(x -&gt; fetchMore(x))</code>'],
  ['<code>.then(x =&gt; { log(x) })</code>', '<code>.thenAccept(x -&gt; log(x))</code>'],
  ['<code>.catch(e =&gt; fallback)</code>', '<code>.exceptionally(e -&gt; fallback)</code>'],
  ['<code>Promise.all([a, b])</code>', '<code>CompletableFuture.allOf(a, b)</code>'],
  ['<code>Promise.any / race</code>', '<code>CompletableFuture.anyOf(a, b)</code>'],
  ['<code>await p</code>', '<code>p.join()</code> — блокирует поток']
])}
${cmp(js`
const [user, orders] = await Promise.all([
  fetchUser(id),
  fetchOrders(id),
]);
return { user, orders };`, java`
var userF = CompletableFuture.supplyAsync(() -> fetchUser(id), executor);
var ordersF = CompletableFuture.supplyAsync(() -> fetchOrders(id), executor);

CompletableFuture.allOf(userF, ordersF).join();
return new Profile(userF.join(), ordersF.join());`)}
<p>Здесь <code>fetchUser</code> и <code>fetchOrders</code> — обычные синхронные (блокирующие) методы. Параллельность достигается тем, что они выполняются в разных потоках.</p>

<h2>Гонки данных</h2>
<p><dfn>Race condition</dfn> (гонка данных) — несколько потоков одновременно меняют общие данные, и результат зависит от случайного порядка выполнения:</p>
${java`
class Counter {
    private int value = 0;
    void increment() { value++; }     // НЕ атомарно: прочитать, прибавить, записать
    int get() { return value; }
}

var counter = new Counter();
try (var pool = Executors.newFixedThreadPool(8)) {
    for (int i = 0; i < 10_000; i++) pool.submit(counter::increment);
}   // close() дождётся завершения всех задач
System.out.println(counter.get());  // чаще всего меньше 10000!`}
<p>Способы защиты, от простого к сложному:</p>
<ol>
  <li><b>Не делить изменяемое состояние</b>: неизменяемые объекты (records, <code>final</code>-поля), локальные переменные. Лучшая стратегия.</li>
  <li><b>Атомарные классы</b>: <code>AtomicInteger</code>, <code>AtomicLong</code> — <code>counter.incrementAndGet()</code>.</li>
  <li><b>Потокобезопасные коллекции</b>: <code>ConcurrentHashMap</code> вместо <code>HashMap</code>, <code>CopyOnWriteArrayList</code>.</li>
  <li><b>Синхронизация</b>: <code>synchronized</code>-методы/блоки или <code>ReentrantLock</code> — только один поток за раз.</li>
</ol>
${java`
class SafeCounter {
    private final AtomicInteger value = new AtomicInteger();
    void increment() { value.incrementAndGet(); }
    int get() { return value.get(); }
}`}
${warn(`<p>Типичная ошибка новичка в Spring — сохранить данные текущего запроса в поле сервиса:</p>${java`
@Service
public class ReportService {
    private User currentUser;          // ОПАСНО: один объект на все потоки!

    public Report build(User user) {
        this.currentUser = user;       // другой запрос может перезаписать поле
        ...
    }
}`}<p>Данные запроса передавай через параметры методов и локальные переменные.</p>`)}

<h2>Virtual threads (Java 21)</h2>
<p>Обычный поток Java — это поток ОС: дорогой (≈1 МБ стека), их тысячи, а не миллионы. Поэтому пул Tomcat ограничен ~200 потоками, и если все они ждут медленную БД — новые запросы встают в очередь.</p>
<p><dfn>Virtual threads</dfn> (виртуальные потоки) — лёгкие потоки, которыми управляет JVM. Когда виртуальный поток блокируется на вводе-выводе, JVM «снимает» его с потока ОС и запускает другой — по сути, event loop внутри JVM, но код остаётся синхронным. Миллион виртуальных потоков — нормально.</p>
${java`
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    List<Future<String>> results = urls.stream()
        .map(url -> executor.submit(() -> download(url)))   // поток на каждую задачу
        .toList();
    for (Future<String> f : results) {
        System.out.println(f.get());
    }
}`}
<p>В Spring Boot 3.2+ включить виртуальные потоки для обработки запросов — одна строка в конфигурации:</p>
${yaml`
spring:
  threads:
    virtual:
      enabled: true`}
${info(`<p>Итог для практики: в Spring ты пишешь обычный синхронный код, а параллелизм обеспечивают сервер и пул потоков. Явная многопоточность нужна в отдельных задачах: параллельные вызовы внешних API, фоновые задачи (<code>@Async</code>, <code>@Scheduled</code>). Главное — не хранить изменяемое состояние в общих объектах.</p>`)}
`,
      tasks: [
        {
          title: 'Параллельная загрузка',
          text: `<p>Есть метод, имитирующий запрос к API:</p>${java`
            static String fetchPrice(String product) throws InterruptedException {
                Thread.sleep(1000);
                return product + ": " + (int) (Math.random() * 1000);
            }`}<p>Получи цены для 5 товаров параллельно через <code>CompletableFuture</code> на виртуальных потоках так, чтобы общее время было ~1 секунда, а не 5. Замерь время через <code>System.currentTimeMillis()</code>.</p>`,
          solution: `${java`
            import java.util.List;
            import java.util.concurrent.*;

            public class Prices {
                static String fetchPrice(String product) {
                    try {
                        Thread.sleep(1000);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        throw new RuntimeException(e);
                    }
                    return product + ": " + (int) (Math.random() * 1000);
                }

                public static void main(String[] args) {
                    List<String> products = List.of("A", "B", "C", "D", "E");
                    long start = System.currentTimeMillis();

                    try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
                        List<CompletableFuture<String>> futures = products.stream()
                            .map(p -> CompletableFuture.supplyAsync(() -> fetchPrice(p), executor))
                            .toList();

                        List<String> prices = futures.stream().map(CompletableFuture::join).toList();
                        prices.forEach(System.out::println);
                    }

                    System.out.println("Заняло " + (System.currentTimeMillis() - start) + " мс");
                }
            }`}<p>Обрати внимание: лямбда для <code>supplyAsync</code> — это <code>Supplier</code>, который не может бросать checked-исключения, поэтому <code>InterruptedException</code> пришлось обработать внутри метода.</p>`
        },
        {
          title: 'Почини счётчик',
          text: `<p>Запусти пример с <code>Counter</code> из урока несколько раз и убедись, что результат «плавает». Затем исправь его двумя способами: через <code>AtomicInteger</code> и через <code>synchronized</code>.</p>`,
          solution: java`
            // Способ 1
            class AtomicCounter {
                private final AtomicInteger value = new AtomicInteger();
                void increment() { value.incrementAndGet(); }
                int get() { return value.get(); }
            }

            // Способ 2
            class SyncCounter {
                private int value;
                synchronized void increment() { value++; }
                synchronized int get() { return value; }
            }`
        }
      ],
      quiz: [
        { q: 'Аналог <code>Promise.all</code>:', options: ['CompletableFuture.allOf', 'ExecutorService.all', 'Thread.join', 'Future.get'], answer: 0, explain: 'allOf ждёт завершения всех переданных future.' },
        { q: 'Аналог <code>.then(x =&gt; anotherPromise(x))</code>, когда функция возвращает future:', options: ['thenApply', 'thenAccept', 'thenCompose', 'exceptionally'], answer: 2, explain: 'thenCompose «разворачивает» вложенный CompletableFuture, как then разворачивает вложенный Promise.' },
        { q: 'Почему нельзя хранить данные текущего запроса в поле Spring-сервиса?', options: ['Поля в сервисах запрещены', 'Сервис один на всё приложение и используется многими потоками одновременно', 'Это медленно', 'Spring обнуляет поля'], answer: 1, explain: 'Бины по умолчанию — синглтоны, их поля общие для всех параллельных запросов.' },
        { q: 'Что дают virtual threads?', options: ['Асинхронный синтаксис как async/await', 'Возможность держать огромное число блокирующих задач без огромного числа потоков ОС', 'Отказ от потоков', 'Автоматическую защиту от гонок'], answer: 1, explain: 'Код остаётся синхронным, а блокировки на I/O стоят дёшево.' }
      ]
    }
  ]
});
