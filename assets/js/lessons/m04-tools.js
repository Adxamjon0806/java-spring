COURSE.addModule({
  id: 'm4',
  title: 'Инструменты: сборка и тесты',
  description: 'Maven и Gradle вместо npm, структура проекта, зависимости. Юнит-тесты на JUnit 5 и Mockito вместо Jest.',
  lessons: [
    {
      id: 'maven-gradle',
      title: 'Maven и Gradle вместо npm',
      minutes: 35,
      goals: [
        'читать и редактировать <code>pom.xml</code> так же уверенно, как <code>package.json</code>',
        'понимать стандартную структуру Maven-проекта',
        'запускать основные команды и знать их npm-аналоги',
        'собирать исполняемый JAR'
      ],
      body: `
<h2>Что делает инструмент сборки</h2>
<p>В Node <code>npm</code> скачивает пакеты, а сборка — отдельные скрипты (tsc, webpack). В Java <dfn>build tool</dfn> (инструмент сборки) делает всё сразу: скачивает зависимости, компилирует, запускает тесты, упаковывает в <dfn>JAR</dfn> (Java ARchive — zip-архив со скомпилированными классами).</p>
<p>Два стандарта: <b>Maven</b> (XML-конфиг, строгий и предсказуемый, самый распространённый) и <b>Gradle</b> (конфиг-скрипт на Kotlin/Groovy, гибче и быстрее). В курсе используем Maven; Gradle разберём кратко — читать его тоже нужно уметь.</p>

<h2>pom.xml против package.json</h2>
${cmp(json`
{
  "name": "todo-api",
  "version": "0.0.1",
  "dependencies": {
    "express": "^4.19.2",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "jest": "^29.7.0"
  },
  "scripts": {
    "test": "jest",
    "build": "tsc"
  }
}`, xml`
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>

  <groupId>com.example</groupId>
  <artifactId>todo-api</artifactId>
  <version>0.0.1-SNAPSHOT</version>

  <properties>
    <maven.compiler.release>21</maven.compiler.release>
  </properties>

  <dependencies>
    <dependency>
      <groupId>com.fasterxml.jackson.core</groupId>
      <artifactId>jackson-databind</artifactId>
      <version>2.18.2</version>
    </dependency>
    <dependency>
      <groupId>org.junit.jupiter</groupId>
      <artifactId>junit-jupiter</artifactId>
      <version>5.11.4</version>
      <scope>test</scope>
    </dependency>
  </dependencies>
</project>`, 'package.json', 'pom.xml')}
<h3>Координаты</h3>
<p>Каждая библиотека в Maven однозначно определяется тройкой <dfn>GAV</dfn>:</p>
<ul>
  <li><b>groupId</b> — организация/проект (как scope <code>@nestjs</code> в npm): <code>org.springframework.boot</code>;</li>
  <li><b>artifactId</b> — имя модуля: <code>spring-boot-starter-web</code>;</li>
  <li><b>version</b> — версия. Суффикс <code>-SNAPSHOT</code> означает «версия в разработке».</li>
</ul>
<h3>Scope — аналог dependencies/devDependencies</h3>
${table(['scope', 'Значение', 'Аналог npm'], [
  ['<code>compile</code> (по умолчанию)', 'Нужна для компиляции и в рантайме', '<code>dependencies</code>'],
  ['<code>test</code>', 'Только для тестов', '<code>devDependencies</code> (тестовые)'],
  ['<code>runtime</code>', 'Не нужна для компиляции, нужна при запуске (например, драйвер БД)', '—'],
  ['<code>provided</code>', 'Предоставит окружение (редко в Spring Boot)', '<code>peerDependencies</code> (отдалённо)']
])}
${info(`<p><b>Версии без диапазонов и без lock-файла.</b> В Maven пишут точные версии (никаких <code>^</code>), поэтому сборки воспроизводимы без <code>package-lock.json</code>. А в Spring Boot версии большинства библиотек вообще не пишут: их задаёт <dfn>BOM</dfn> (Bill of Materials — согласованный список версий) родительского проекта. Ты указываешь только версию Spring Boot.</p>`)}

<h2>Стандартная структура проекта</h2>
<p>Maven построен на принципе <dfn>convention over configuration</dfn> (соглашения вместо конфигурации): если положить файлы в стандартные места, ничего настраивать не нужно.</p>
${tree`
todo-api/
├── pom.xml                    ← как package.json
├── mvnw, mvnw.cmd             ← Maven Wrapper (запуск без установки Maven)
├── .mvn/wrapper/              ← версия Maven для wrapper
├── src/
│   ├── main/
│   │   ├── java/              ← исходный код
│   │   │   └── com/example/todo/...
│   │   └── resources/         ← конфиги, SQL-миграции, статика
│   │       └── application.yml
│   └── test/
│       ├── java/              ← тесты (те же пакеты, что в main)
│       └── resources/
└── target/                    ← результат сборки (как dist/), в .gitignore`}

<h2>Команды</h2>
${table(['npm', 'Maven', 'Что происходит'], [
  ['<code>npm install</code>', '<i>не нужен</i> — зависимости скачиваются автоматически при любой сборке', 'Загрузка в <code>~/.m2/repository</code>'],
  ['<code>npm run build</code>', '<code>./mvnw compile</code>', 'Компиляция в <code>target/classes</code>'],
  ['<code>npm test</code>', '<code>./mvnw test</code>', 'Компиляция + тесты'],
  ['—', '<code>./mvnw package</code>', 'Компиляция + тесты + сборка JAR в <code>target/</code>'],
  ['<code>npm start</code>', '<code>./mvnw spring-boot:run</code>', 'Запуск Spring Boot-приложения'],
  ['<code>npm ls</code>', '<code>./mvnw dependency:tree</code>', 'Дерево зависимостей'],
  ['<code>rm -rf dist</code>', '<code>./mvnw clean</code>', 'Удалить <code>target/</code>'],
  ['<code>npm test -- -t "name"</code>', '<code>./mvnw test -Dtest=UserServiceTest</code>', 'Запустить один тест-класс']
])}
<p>На Windows вместо <code>./mvnw</code> пиши <code>mvnw.cmd</code> или <code>.\\mvnw</code>. Флаг <code>-DskipTests</code> пропускает тесты, <code>-q</code> — тихий режим.</p>
${node(`<p>Главное отличие от <code>node_modules</code>: зависимости хранятся <b>один раз на компьютер</b> в <code>~/.m2/repository</code>, а не в каждом проекте. Никаких гигабайтных папок в каждом репозитории.</p>`)}

<h3>Жизненный цикл</h3>
<p>Команды Maven — это <dfn>phases</dfn> (фазы) жизненного цикла, и каждая выполняет все предыдущие:</p>
${flow('validate', 'compile', 'test', 'package', 'verify', 'install')}
<p><code>mvn package</code> = compile + test + package. <code>install</code> кладёт твой JAR в локальный репозиторий <code>~/.m2</code>, чтобы его могли использовать другие твои проекты (как <code>npm link</code>).</p>

<h3>Плагины</h3>
<p>Всю работу в Maven выполняют <dfn>plugins</dfn>: компиляцию — <code>maven-compiler-plugin</code>, тесты — <code>maven-surefire-plugin</code>, запуск Spring Boot — <code>spring-boot-maven-plugin</code>. Они подключаются в секции <code>&lt;build&gt;&lt;plugins&gt;</code>. В Spring Boot-проекте всё нужное уже настроено.</p>

<h2>Исполняемый JAR</h2>
<p>Spring Boot собирает <dfn>fat JAR</dfn> (он же uber-JAR) — один файл, внутри которого твой код, все зависимости и встроенный веб-сервер. Деплой — это просто:</p>
${bash`
./mvnw package
java -jar target/todo-api-0.0.1-SNAPSHOT.jar`}
<p>Аналогия: как если бы <code>node_modules</code> и сам <code>node</code> были упакованы в один файл. На сервере нужна только JRE.</p>

<h2>Gradle — коротко</h2>
${cmp(xml`
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-web</artifactId>
</dependency>
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-test</artifactId>
  <scope>test</scope>
</dependency>`, text`
// build.gradle.kts
plugins {
    java
    id("org.springframework.boot") version "3.5.0"
    id("io.spring.dependency-management") version "1.1.7"
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
}`, 'Maven', 'Gradle (Kotlin DSL)')}
${table(['Maven', 'Gradle'], [
  ['<code>./mvnw test</code>', '<code>./gradlew test</code>'],
  ['<code>./mvnw package</code>', '<code>./gradlew build</code> (JAR в <code>build/libs</code>)'],
  ['<code>./mvnw spring-boot:run</code>', '<code>./gradlew bootRun</code>'],
  ['scope compile / test', '<code>implementation</code> / <code>testImplementation</code>']
])}
`,
      tasks: [
        {
          title: 'Первый Maven-проект',
          text: `<p>Создай в IDEA Maven-проект (или командой ниже), добавь зависимость <code>com.google.code.gson:gson:2.11.0</code> и напиши <code>main</code>, который превращает объект в JSON и обратно. Выполни <code>mvn package</code> и найди JAR в <code>target/</code>. Посмотри <code>mvn dependency:tree</code>.</p>${bash`
            mvn archetype:generate -DgroupId=com.example -DartifactId=json-demo -DarchetypeArtifactId=maven-archetype-quickstart -DinteractiveMode=false`}`,
          solution: `${xml`
            <dependency>
              <groupId>com.google.code.gson</groupId>
              <artifactId>gson</artifactId>
              <version>2.11.0</version>
            </dependency>`}${java`
            package com.example;

            import com.google.gson.Gson;

            public class App {
                record Book(String title, int year) {}

                public static void main(String[] args) {
                    Gson gson = new Gson();
                    String json = gson.toJson(new Book("Effective Java", 2018));
                    System.out.println(json);              // {"title":"Effective Java","year":2018}

                    Book back = gson.fromJson(json, Book.class);
                    System.out.println(back);
                }
            }`}<p>Для records нужна Gson 2.10+. Если Maven пишет, что target release не поддерживается, — добавь в <code>&lt;properties&gt;</code> строку <code>&lt;maven.compiler.release&gt;21&lt;/maven.compiler.release&gt;</code>.</p>`
        }
      ],
      quiz: [
        { q: 'Где Maven хранит скачанные зависимости?', options: ['В node_modules проекта', 'В target/', 'В ~/.m2/repository, общем для всех проектов', 'В src/main/resources'], answer: 2, explain: 'Локальный репозиторий один на пользователя.' },
        { q: 'Что выполнит <code>mvn package</code>?', options: ['Только упаковку', 'Компиляцию, тесты и упаковку в JAR', 'Только тесты', 'Деплой в Maven Central'], answer: 1, explain: 'Фазы выполняются по порядку: compile → test → package.' },
        { q: 'Аналог devDependencies для тестовых библиотек:', options: ['&lt;scope&gt;test&lt;/scope&gt;', '&lt;scope&gt;dev&lt;/scope&gt;', '&lt;optional&gt;', 'Отдельный pom.xml'], answer: 0, explain: 'Зависимость с scope test доступна только в src/test.' },
        { q: 'Где лежит application.yml в Maven-проекте?', options: ['В корне', 'src/main/java', 'src/main/resources', 'target/'], answer: 2, explain: 'Ресурсы (конфиги, миграции) — в src/main/resources.' }
      ]
    },

    {
      id: 'junit-mockito',
      title: 'Тестирование: JUnit 5, AssertJ, Mockito',
      minutes: 35,
      goals: [
        'писать юнит-тесты на JUnit 5',
        'использовать выразительные проверки AssertJ',
        'параметризовать тесты',
        'подменять зависимости моками Mockito'
      ],
      body: `
<h2>Стек</h2>
${table(['Задача', 'Jest', 'Java'], [
  ['Тест-раннер, структура', '<code>describe</code>, <code>test</code>', '<dfn>JUnit 5</dfn>: классы и методы с <code>@Test</code>'],
  ['Проверки', '<code>expect(x).toBe(y)</code>', '<dfn>AssertJ</dfn>: <code>assertThat(x).isEqualTo(y)</code>'],
  ['Моки', '<code>jest.fn()</code>, <code>jest.mock()</code>', '<dfn>Mockito</dfn>: <code>mock()</code>, <code>when()</code>, <code>verify()</code>']
])}
<p>Зависимости для обычного проекта: <code>org.junit.jupiter:junit-jupiter</code>, <code>org.assertj:assertj-core</code>, <code>org.mockito:mockito-junit-jupiter</code> (все со scope test). В Spring Boot всё это уже входит в <code>spring-boot-starter-test</code>.</p>

<h2>Первый тест</h2>
<p>Тесты лежат в <code>src/test/java</code> в <b>том же пакете</b>, что и тестируемый класс; имя — <code>ИмяКлассаTest</code>.</p>
${cmp(js`
describe("PriceCalculator", () => {
  const calc = new PriceCalculator();

  test("applies 10% discount from 1000", () => {
    expect(calc.total(1000)).toBe(900);
  });

  test("throws on negative", () => {
    expect(() => calc.total(-1))
      .toThrow("negative");
  });
});`, java`
class PriceCalculatorTest {
    private final PriceCalculator calc = new PriceCalculator();

    @Test
    void appliesDiscountFrom1000() {
        BigDecimal result = calc.total(new BigDecimal("1000"));
        assertThat(result).isEqualByComparingTo("900");
    }

    @Test
    void throwsOnNegative() {
        assertThatThrownBy(() -> calc.total(new BigDecimal("-1")))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("negative");
    }
}`, 'Jest', 'JUnit 5 + AssertJ')}
<p>Статические импорты для этих примеров: <code>import static org.assertj.core.api.Assertions.*;</code> и <code>import org.junit.jupiter.api.Test;</code>. IDEA добавит их по <kbd>Alt</kbd>+<kbd>Enter</kbd>.</p>
${tip(`<p>Методы тестов не обязаны быть <code>public</code>. Имена — описательные: <code>appliesDiscountFrom1000</code>. Для читаемого имени в отчёте есть <code>@DisplayName("применяет скидку 10% от 1000")</code>.</p>`)}

<h2>AssertJ — шпаргалка</h2>
${java`
assertThat(name).isEqualTo("Аня").startsWith("А").hasSize(3);
assertThat(age).isGreaterThan(18).isBetween(18, 65);
assertThat(user).isNotNull();
assertThat(price).isEqualByComparingTo("19.99");      // BigDecimal: сравнение по значению
assertThat(list).hasSize(3).contains("a", "b").doesNotContain("z");
assertThat(list).extracting(User::name).containsExactly("Аня", "Боря");
assertThat(map).containsEntry("key", 1);
assertThat(optional).isPresent().contains(user);
assertThat(user).usingRecursiveComparison().isEqualTo(expected);  // как toEqual в Jest`}

<h2>Жизненный цикл и группировка</h2>
${cmp(js`
beforeEach(() => { repo = new FakeRepo(); });
afterEach(() => { ... });
beforeAll(() => { ... });

describe("when empty", () => {
  test("...", () => {});
});

test.skip("not ready", () => {});`, java`
@BeforeEach void setUp() { repo = new FakeRepo(); }
@AfterEach void tearDown() { ... }
@BeforeAll static void init() { ... }   // static!

@Nested
class WhenEmpty {
    @Test void ...() {}
}

@Disabled("not ready") @Test void notReady() {}`, 'Jest', 'JUnit 5')}
${info(`<p>JUnit создаёт <b>новый экземпляр тест-класса для каждого теста</b>, поэтому поля, инициализированные при объявлении, в каждом тесте свежие.</p>`)}

<h2>Параметризованные тесты</h2>
<p>Аналог <code>test.each</code>:</p>
${java`
@ParameterizedTest
@CsvSource({
    "100,  100",
    "999,  999",
    "1000, 900",
    "2000, 1800"
})
void calculatesTotal(String input, String expected) {
    assertThat(calc.total(new BigDecimal(input))).isEqualByComparingTo(expected);
}

@ParameterizedTest
@ValueSource(strings = {"", " ", "no-at-sign"})
void rejectsInvalidEmails(String email) {
    assertThatThrownBy(() -> new Email(email)).isInstanceOf(IllegalArgumentException.class);
}`}

<h2>Mockito</h2>
<p>Юнит-тест проверяет класс изолированно, поэтому его зависимости (репозиторий, отправка писем) заменяются моками. Это работает, потому что зависимости передаются через конструктор — именно так устроен Spring.</p>
${java`
@@ UserService.java
public class UserService {
    private final UserRepository repo;
    private final EmailSender emailSender;

    public UserService(UserRepository repo, EmailSender emailSender) {
        this.repo = repo;
        this.emailSender = emailSender;
    }

    public User register(String email, String name) {
        if (repo.existsByEmail(email)) {
            throw new DuplicateEmailException(email);
        }
        User user = repo.save(new User(email, name));
        emailSender.sendWelcome(email);
        return user;
    }
}`}
${cmp(js`
const repo = {
  existsByEmail: jest.fn().mockReturnValue(false),
  save: jest.fn(u => u),
};
const emailSender = { sendWelcome: jest.fn() };
const service = new UserService(repo, emailSender);

test("registers new user", () => {
  const user = service.register("a@b.c", "Аня");

  expect(user.email).toBe("a@b.c");
  expect(emailSender.sendWelcome)
    .toHaveBeenCalledWith("a@b.c");
});`, java`
@ExtendWith(MockitoExtension.class)
class UserServiceTest {
    @Mock UserRepository repo;
    @Mock EmailSender emailSender;
    @InjectMocks UserService service;   // создаст сервис с моками

    @Test
    void registersNewUser() {
        when(repo.existsByEmail("a@b.c")).thenReturn(false);
        when(repo.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User user = service.register("a@b.c", "Аня");

        assertThat(user.getEmail()).isEqualTo("a@b.c");
        verify(emailSender).sendWelcome("a@b.c");
    }

    @Test
    void rejectsDuplicateEmail() {
        when(repo.existsByEmail("a@b.c")).thenReturn(true);

        assertThatThrownBy(() -> service.register("a@b.c", "Аня"))
            .isInstanceOf(DuplicateEmailException.class);
        verify(repo, never()).save(any());
        verifyNoInteractions(emailSender);
    }
}`, 'Jest', 'Mockito')}
${table(['Mockito', 'Смысл'], [
  ['<code>when(mock.method(args)).thenReturn(x)</code>', 'Задать возвращаемое значение'],
  ['<code>.thenThrow(new X())</code>', 'Бросить исключение'],
  ['<code>.thenAnswer(inv -&gt; ...)</code>', 'Вычислить ответ по аргументам'],
  ['<code>any()</code>, <code>any(User.class)</code>, <code>eq(x)</code>, <code>anyString()</code>', 'Матчеры аргументов'],
  ['<code>verify(mock).method(args)</code>', 'Проверить, что вызвали'],
  ['<code>verify(mock, times(2))</code>, <code>never()</code>', 'Проверить число вызовов'],
  ['<code>ArgumentCaptor</code>', 'Захватить аргумент и проверить его поля']
])}
${warn(`<p>Не вызванный через <code>when</code> метод мока возвращает «пустое» значение: <code>null</code>, <code>0</code>, <code>false</code>, пустую коллекцию. Если тест падает с NPE — скорее всего, ты забыл застабить метод.</p>`)}
`,
      tasks: [
        {
          title: 'Тесты для Cart',
          text: `<p>Напиши тесты для класса <code>Cart</code> из урока по коллекциям: добавление увеличивает количество; повторное добавление суммируется; <code>quantity</code> несуществующего товара — 0; <code>add</code> с нулевым количеством бросает исключение; <code>items()</code> нельзя изменить снаружи. Используй <code>@BeforeEach</code> и <code>@ParameterizedTest</code> для невалидных количеств.</p>`,
          solution: java`
            class CartTest {
                private Cart cart;

                @BeforeEach
                void setUp() { cart = new Cart(); }

                @Test
                void addsItem() {
                    cart.add("A1", 2);
                    assertThat(cart.quantity("A1")).isEqualTo(2);
                }

                @Test
                void sumsRepeatedAdds() {
                    cart.add("A1", 2);
                    cart.add("A1", 3);
                    assertThat(cart.quantity("A1")).isEqualTo(5);
                }

                @Test
                void unknownItemHasZeroQuantity() {
                    assertThat(cart.quantity("nope")).isZero();
                }

                @ParameterizedTest
                @ValueSource(ints = {0, -1, -100})
                void rejectsNonPositiveQuantity(int qty) {
                    assertThatThrownBy(() -> cart.add("A1", qty))
                        .isInstanceOf(IllegalArgumentException.class);
                }

                @Test
                void itemsAreUnmodifiable() {
                    cart.add("A1", 1);
                    assertThatThrownBy(() -> cart.items().put("B2", 1))
                        .isInstanceOf(UnsupportedOperationException.class);
                }
            }`
        },
        {
          title: 'Мок с ArgumentCaptor',
          text: `<p>Проверь, что <code>UserService.register</code> сохраняет пользователя с email в <b>нижнем регистре</b> (добавь эту логику в сервис). Используй <code>ArgumentCaptor&lt;User&gt;</code>, чтобы достать объект, переданный в <code>repo.save</code>.</p>`,
          solution: java`
            @Test
            void savesEmailInLowerCase() {
                when(repo.existsByEmail(anyString())).thenReturn(false);
                when(repo.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

                service.register("Anya@Mail.RU", "Аня");

                ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
                verify(repo).save(captor.capture());
                assertThat(captor.getValue().getEmail()).isEqualTo("anya@mail.ru");
            }

            // в сервисе:
            // String normalized = email.strip().toLowerCase();
            // if (repo.existsByEmail(normalized)) ...
            // repo.save(new User(normalized, name));`
        }
      ],
      quiz: [
        { q: 'Какая аннотация помечает тестовый метод в JUnit 5?', options: ['@Test', '@TestCase', '@It', '@Spec'], answer: 0, explain: 'org.junit.jupiter.api.Test.' },
        { q: 'Аналог <code>expect(fn).toHaveBeenCalledWith(x)</code>:', options: ['assertThat(fn).called(x)', 'verify(mock).method(x)', 'when(mock.method(x))', 'mock.wasCalled(x)'], answer: 1, explain: 'verify проверяет взаимодействие с моком.' },
        { q: 'Что вернёт метод мока, для которого не задан when(...)?', options: ['Исключение', 'Значение по умолчанию: null / 0 / false / пустая коллекция', 'Реальный результат', 'Случайное значение'], answer: 1, explain: 'Отсюда частые NPE в тестах — забытый стаб.' },
        { q: 'Как правильно сравнить BigDecimal в AssertJ?', options: ['isEqualTo("1.0")', 'isEqualByComparingTo("1.0")', 'isSameAs', '=='], answer: 1, explain: 'BigDecimal("1.0").equals(BigDecimal("1.00")) == false из-за масштаба; compareTo сравнивает только значение.' }
      ]
    }
  ]
});
