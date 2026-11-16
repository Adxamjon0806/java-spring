COURSE.addModule({
  id: 'm5',
  title: 'Spring Core и Spring Boot',
  description: 'Сердце Spring: IoC-контейнер и внедрение зависимостей. Что добавляет Spring Boot: стартеры, автоконфигурация, конфиги и профили.',
  lessons: [
    {
      id: 'ioc-di',
      title: 'IoC и Dependency Injection',
      minutes: 40,
      goals: [
        'объяснить, какую проблему решает IoC-контейнер',
        'объявлять бины через <code>@Component</code>/<code>@Service</code> и <code>@Bean</code>',
        'внедрять зависимости через конструктор',
        'разрешать неоднозначности: несколько реализаций одного интерфейса',
        'понимать scope бинов и прокси'
      ],
      body: `
<h2>Проблема: кто создаёт объекты?</h2>
<p>В Node-проекте зависимости обычно соединяют вручную — в <code>app.js</code> или через импорты модулей-синглтонов:</p>
${js`
// composition root в Express-приложении
const pool = createPool(config.db);
const userRepo = new UserRepository(pool);
const mailer = new Mailer(config.smtp);
const userService = new UserService(userRepo, mailer);
const userController = new UserController(userService);

app.use("/users", userController.router);`}
<p>Пока классов десять — терпимо. Когда их триста — ручная сборка графа объектов превращается в боль, а импорты-синглтоны мешают подменять зависимости в тестах.</p>

<h2>Решение: IoC-контейнер</h2>
<p><dfn>IoC</dfn> (Inversion of Control — инверсия управления): не ты создаёшь объекты и соединяешь их, а фреймворк. Ты только описываешь, какие объекты нужны и от чего они зависят.</p>
<p><dfn>DI</dfn> (Dependency Injection — внедрение зависимостей): способ реализации IoC — объект получает зависимости снаружи (через конструктор), а не создаёт их сам.</p>
<p>В Spring этим занимается <dfn>ApplicationContext</dfn> (контекст приложения, он же IoC-контейнер). Объекты, которыми он управляет, называются <dfn>beans</dfn> (бины).</p>
${java`
@Repository
public class UserRepository {
    // ...
}

@Component
public class Mailer {
    // ...
}

@Service
public class UserService {
    private final UserRepository userRepository;
    private final Mailer mailer;

    // Spring видит конструктор и передаёт нужные бины сам
    public UserService(UserRepository userRepository, Mailer mailer) {
        this.userRepository = userRepository;
        this.mailer = mailer;
    }
}`}
<p>При старте Spring:</p>
<ol>
  <li><b>сканирует пакеты</b> (<dfn>component scan</dfn>) и находит классы с аннотациями-стереотипами;</li>
  <li>строит граф зависимостей по параметрам конструкторов;</li>
  <li>создаёт объекты в правильном порядке и складывает их в контекст;</li>
  <li>если зависимость не найдена или их несколько — <b>приложение не стартует</b> с понятной ошибкой. Это плюс: ошибка конфигурации видна сразу, а не на первом запросе.</li>
</ol>
${node(`<p>Если ты работал с <b>NestJS</b> — это та же идея: <code>@Injectable()</code> ≈ <code>@Service</code>, модули и провайдеры ≈ component scan и <code>@Configuration</code>. NestJS во многом вдохновлён Spring и Angular.</p>`)}

<h2>Стереотипы</h2>
${table(['Аннотация', 'Для чего'], [
  ['<code>@Component</code>', 'Общий бин, базовая аннотация'],
  ['<code>@Service</code>', 'Бизнес-логика (по сути @Component с говорящим именем)'],
  ['<code>@Repository</code>', 'Доступ к данным; дополнительно переводит ошибки БД в исключения Spring'],
  ['<code>@Controller</code> / <code>@RestController</code>', 'Обработка HTTP-запросов (модуль 6)'],
  ['<code>@Configuration</code>', 'Класс с методами <code>@Bean</code> — ручное описание бинов']
])}

<h2>Внедрение через конструктор</h2>
<p>Есть три способа внедрения, но использовать стоит один — <b>constructor injection</b>:</p>
${java`
// ✅ Через конструктор — рекомендуемый способ
@Service
public class OrderService {
    private final OrderRepository orders;   // final: зависимость не изменится

    public OrderService(OrderRepository orders) {
        this.orders = orders;
    }
}

// ❌ Через поле — встречается в старом коде
@Service
public class LegacyService {
    @Autowired
    private OrderRepository orders;   // не final, скрытая зависимость, сложнее тестировать
}`}
<ul>
  <li>Если у класса <b>один конструктор</b>, аннотация <code>@Autowired</code> не нужна.</li>
  <li>Поля <code>final</code> — объект гарантированно полностью инициализирован.</li>
  <li>В тестах просто вызываешь <code>new OrderService(mockRepo)</code> — без Spring.</li>
  <li>Если конструктор раздулся до 7+ параметров — это сигнал, что класс делает слишком много.</li>
</ul>

<h2>@Configuration и @Bean</h2>
<p>Аннотацию <code>@Component</code> можно поставить только на свой класс. Чтобы сделать бином объект из сторонней библиотеки или объект со сложной настройкой, используют фабричные методы:</p>
${java`
@Configuration
public class AppConfig {

    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }

    @Bean
    public RestClient githubClient(RestClient.Builder builder) {  // параметры — тоже бины
        return builder.baseUrl("https://api.github.com").build();
    }
}

@Service
public class SubscriptionService {
    private final Clock clock;   // будет внедрён бин из AppConfig

    public SubscriptionService(Clock clock) { this.clock = clock; }

    public boolean isExpired(Instant until) {
        return Instant.now(clock).isAfter(until);   // в тестах подставим фиксированный Clock
    }
}`}

<h2>Несколько реализаций одного интерфейса</h2>
${java`
public interface NotificationSender {
    void send(String to, String text);
}

@Component
public class EmailSender implements NotificationSender { ... }

@Component
public class SmsSender implements NotificationSender { ... }

@Service
public class AlertService {
    public AlertService(NotificationSender sender) { ... }   // ошибка: какой из двух?
}`}
<p>Spring не стартует: <code>expected single matching bean but found 2</code>. Варианты решения:</p>
${java`
// 1. @Primary — реализация по умолчанию
@Component
@Primary
public class EmailSender implements NotificationSender { ... }

// 2. @Qualifier — указать явно по имени бина (по умолчанию — имя класса с маленькой буквы)
public AlertService(@Qualifier("smsSender") NotificationSender sender) { ... }

// 3. Взять все реализации сразу
public AlertService(List<NotificationSender> senders) {
    this.senders = senders;    // [EmailSender, SmsSender]
}

// 4. Или Map: имя бина -> бин
public AlertService(Map<String, NotificationSender> sendersByName) { ... }`}
<p>Вариант 3 — частый приём для паттерна «Стратегия» или цепочек обработчиков: добавляешь новый класс с <code>@Component</code> — и он автоматически подключается.</p>

<h2>Scope и жизненный цикл</h2>
${table(['Scope', 'Сколько экземпляров'], [
  ['<code>singleton</code> (по умолчанию)', 'Один на весь контекст. 99% бинов'],
  ['<code>prototype</code>', 'Новый при каждом запросе бина из контекста'],
  ['<code>request</code>, <code>session</code>', 'Свой на HTTP-запрос / сессию (в веб-приложении)']
])}
${warn(`<p>Бин-синглтон обслуживает все запросы во всех потоках одновременно (вспомни урок про многопоточность). <b>Не храни в полях бинов изменяемое состояние</b>, относящееся к конкретному запросу или пользователю. Поля сервиса — это только его зависимости и неизменяемая конфигурация.</p>`)}
${java`
@Component
public class CacheWarmer {
    @PostConstruct           // после создания и внедрения зависимостей
    void warmUp() { ... }

    @PreDestroy              // перед остановкой приложения
    void cleanUp() { ... }
}`}

<h2>Как работает «магия»: прокси</h2>
<p>Многие аннотации Spring (<code>@Transactional</code>, <code>@Cacheable</code>, <code>@Async</code>, <code>@PreAuthorize</code>) работают через <dfn>proxy</dfn> (прокси). Spring внедряет не твой объект напрямую, а обёртку вокруг него, которая перед вызовом метода делает дополнительную работу — открывает транзакцию, проверяет кэш — и затем вызывает настоящий метод. Это <dfn>AOP</dfn> (Aspect-Oriented Programming — аспектно-ориентированное программирование).</p>
${flow('Controller', 'Proxy(OrderService): начать транзакцию', 'OrderService.placeOrder()', 'Proxy: commit / rollback')}
${node(`<p>Похоже на обёртку функции декоратором или middleware: <code>withTransaction(placeOrder)</code>. Только оборачивание делает Spring, глядя на аннотации.</p>`)}
${warn(`<p>Важное следствие: прокси перехватывает только вызовы <b>снаружи</b>. Если метод бина вызывает другой свой метод с <code>@Transactional</code> через <code>this</code>, аннотация не сработает — вызов идёт мимо прокси. Мы вернёмся к этому в модуле про транзакции.</p>`)}
`,
      tasks: [
        {
          title: 'Собери граф вручную',
          text: `<p>Перед тем как доверить это Spring, сделай DI вручную. Создай интерфейс <code>GreetingRepository</code> с методом <code>String template(String lang)</code>, реализацию <code>InMemoryGreetingRepository</code> (Map: "ru" → "Привет, %s!", "en" → "Hello, %s!") и <code>GreetingService</code> с методом <code>greet(String name, String lang)</code>. Соедини объекты в <code>main</code> через конструкторы. Затем напиши тест для сервиса с фейковым репозиторием-лямбдой.</p>`,
          solution: java`
            interface GreetingRepository {
                String template(String lang);
            }

            class InMemoryGreetingRepository implements GreetingRepository {
                private final Map<String, String> templates = Map.of(
                    "ru", "Привет, %s!",
                    "en", "Hello, %s!");

                @Override
                public String template(String lang) {
                    return templates.getOrDefault(lang, "Hi, %s!");
                }
            }

            class GreetingService {
                private final GreetingRepository repo;
                GreetingService(GreetingRepository repo) { this.repo = repo; }

                String greet(String name, String lang) {
                    return repo.template(lang).formatted(name);
                }
            }

            // main: "composition root"
            var service = new GreetingService(new InMemoryGreetingRepository());
            System.out.println(service.greet("Аня", "ru"));

            // тест: GreetingRepository — функциональный интерфейс, фейк = лямбда
            @Test
            void greetsUsingTemplate() {
                var service = new GreetingService(lang -> "Yo, %s");
                assertThat(service.greet("Боб", "any")).isEqualTo("Yo, Боб");
            }`
        }
      ],
      quiz: [
        { q: 'Что такое бин в Spring?', options: ['Любой Java-объект', 'Объект, созданный и управляемый IoC-контейнером', 'Класс с геттерами и сеттерами', 'JAR-файл'], answer: 1, explain: 'Бины создаёт и связывает ApplicationContext.' },
        { q: 'Рекомендуемый способ внедрения зависимостей:', options: ['@Autowired на поле', 'Через конструктор', 'Через сеттер', 'Через new внутри класса'], answer: 1, explain: 'Конструктор: final-поля, явные зависимости, лёгкое тестирование.' },
        { q: 'Как сделать бином объект класса из сторонней библиотеки?', options: ['Поставить на него @Component', 'Метод с @Bean в @Configuration-классе', 'Никак', 'Унаследоваться от него'], answer: 1, explain: 'Код библиотеки ты не меняешь, поэтому объект создаёшь в фабричном методе @Bean.' },
        { q: 'Две реализации интерфейса — бины, сервис просит одну. Что будет?', options: ['Spring возьмёт первую', 'Spring возьмёт случайную', 'Ошибка при старте, если не указать @Primary или @Qualifier', 'Внедрится null'], answer: 2, explain: 'NoUniqueBeanDefinitionException — приложение не запустится.' },
        { q: 'Какой scope у бина по умолчанию?', options: ['prototype', 'request', 'singleton', 'session'], answer: 2, explain: 'Один экземпляр на контекст, общий для всех потоков.' }
      ]
    },

    {
      id: 'spring-boot',
      title: 'Spring Boot: старт проекта и конфигурация',
      minutes: 40,
      goals: [
        'создать проект на start.spring.io и запустить его',
        'понимать, что делают стартеры и автоконфигурация',
        'настраивать приложение через <code>application.yml</code> и переменные окружения',
        'использовать <code>@ConfigurationProperties</code> и профили'
      ],
      body: `
<h2>Spring Framework и Spring Boot</h2>
<p><dfn>Spring Framework</dfn> — сам фреймворк: IoC-контейнер, веб, транзакции. Раньше его приходилось долго настраивать вручную (XML, десятки бинов). <dfn>Spring Boot</dfn> — надстройка, которая делает это за тебя:</p>
<ul>
  <li><dfn>starters</dfn> (стартеры) — готовые наборы зависимостей: <code>spring-boot-starter-web</code> притянет Spring MVC, Jackson, Tomcat с согласованными версиями;</li>
  <li><dfn>auto-configuration</dfn> (автоконфигурация) — бины создаются автоматически в зависимости от того, что лежит в classpath и что указано в настройках;</li>
  <li><b>встроенный сервер</b> — Tomcat внутри приложения, запуск через <code>java -jar</code>, как <code>node server.js</code>;</li>
  <li>единая система конфигурации, health-checks, метрики.</li>
</ul>
${info(`<p><b>О версиях.</b> Примеры курса написаны для Spring Boot 3.x — самой распространённой версии в проде и в учебных материалах. Spring Boot 4 (вышел в ноябре 2025) сохраняет те же концепции и аннотации; отличаются имена некоторых стартеров и пакеты тестовых аннотаций — IDE подскажет нужный импорт. Если на start.spring.io доступна только 4.x — смело бери её.</p>`)}

<h2>Создаём проект</h2>
<p>Открой <b>start.spring.io</b> (или в IDEA: New Project → Spring Boot) и выбери:</p>
<ul>
  <li>Project: <b>Maven</b>, Language: <b>Java</b>, Java: <b>21</b>, Packaging: <b>Jar</b></li>
  <li>Group: <code>com.example</code>, Artifact: <code>todo-api</code></li>
  <li>Dependencies: <b>Spring Web</b>, <b>Validation</b>, <b>Spring Boot DevTools</b></li>
</ul>
<p>Это будет наш учебный проект на следующие модули.</p>
${tree`
todo-api/
├── pom.xml
├── mvnw, mvnw.cmd
└── src/
    ├── main/
    │   ├── java/com/example/todo/
    │   │   └── TodoApiApplication.java
    │   └── resources/
    │       ├── application.properties   ← переименуй в application.yml
    │       ├── static/                  ← статические файлы
    │       └── templates/
    └── test/java/com/example/todo/
        └── TodoApiApplicationTests.java`}
${java`
@@ TodoApiApplication.java
package com.example.todo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class TodoApiApplication {
    public static void main(String[] args) {
        SpringApplication.run(TodoApiApplication.class, args);
    }
}`}
<p><code>@SpringBootApplication</code> объединяет три аннотации:</p>
<ul>
  <li><code>@Configuration</code> — этот класс может объявлять <code>@Bean</code>;</li>
  <li><code>@EnableAutoConfiguration</code> — включить автоконфигурацию;</li>
  <li><code>@ComponentScan</code> — искать бины <b>в этом пакете и всех вложенных</b>. Поэтому главный класс лежит в корневом пакете, а остальные классы — в подпакетах.</li>
</ul>
${bash`
./mvnw spring-boot:run       # Windows: mvnw.cmd spring-boot:run
# ... Tomcat started on port 8080 (http) ...`}
<p>Открой <code>http://localhost:8080</code> — увидишь «Whitelabel Error Page» (404): сервер работает, просто эндпоинтов ещё нет.</p>

<h2>pom.xml Spring Boot-проекта</h2>
${xml`
<parent>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-parent</artifactId>
  <version>3.5.0</version>          <!-- единственная версия, которую ты указываешь -->
</parent>

<properties>
  <java.version>21</java.version>
</properties>

<dependencies>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>   <!-- версия из parent -->
  </dependency>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
  </dependency>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-devtools</artifactId>
    <scope>runtime</scope>
    <optional>true</optional>
  </dependency>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
  </dependency>
</dependencies>`}
<p><dfn>DevTools</dfn> — аналог nodemon: перезапускает приложение при перекомпиляции. В IDEA включи <i>Settings → Build → Compiler → Build project automatically</i> и <i>Advanced Settings → Allow auto-make to start even if developed application is currently running</i>.</p>

<h2>Автоконфигурация: что происходит внутри</h2>
<p>Внутри Spring Boot сотни классов автоконфигурации с условиями вида «если в classpath есть класс X и пользователь сам не объявил бин Y — создать Y». Например:</p>
<ul>
  <li>есть Tomcat и Spring MVC → поднять веб-сервер на порту <code>server.port</code>;</li>
  <li>есть Jackson → настроить <code>ObjectMapper</code> для JSON;</li>
  <li>есть драйвер PostgreSQL и <code>spring.datasource.url</code> → создать пул соединений HikariCP.</li>
</ul>
<p><b>Ключевое правило: твой бин побеждает автоконфигурацию.</b> Объявил свой <code>ObjectMapper</code> — Boot не будет создавать свой. Посмотреть, какие автоконфигурации сработали и почему: запусти с флагом <code>--debug</code> (раздел CONDITIONS EVALUATION REPORT).</p>

<h2>Конфигурация: application.yml</h2>
<p>Аналог <code>.env</code> + <code>config.js</code>. Можно использовать <code>.properties</code> или <code>.yml</code> — выбирай YAML, он нагляднее для вложенных настроек.</p>
${cmp(props`
# application.properties
server.port=8080
spring.application.name=todo-api
app.max-tasks-per-user=100
app.token-ttl=1h`, yaml`
# application.yml
server:
  port: 8080
spring:
  application:
    name: todo-api
app:
  max-tasks-per-user: 100
  token-ttl: 1h`, '.properties', '.yml')}
<h3>Переменные окружения и плейсхолдеры</h3>
${yaml`
spring:
  datasource:
    url: \${DB_URL:jdbc:postgresql://localhost:5432/todo}   # значение из env или дефолт
    password: \${DB_PASSWORD}                               # обязательно из env`}
<p>Кроме того, любое свойство можно переопределить переменной окружения напрямую по правилу <dfn>relaxed binding</dfn>: точки → подчёркивания, дефисы убрать, всё в верхний регистр.</p>
${table(['Свойство', 'Переменная окружения'], [
  ['<code>server.port</code>', '<code>SERVER_PORT=9090</code>'],
  ['<code>spring.datasource.url</code>', '<code>SPRING_DATASOURCE_URL=...</code>'],
  ['<code>app.max-tasks-per-user</code>', '<code>APP_MAXTASKSPERUSER=50</code>']
])}
<p>Приоритет (от высшего): аргументы командной строки (<code>--server.port=9090</code>) → переменные окружения → <code>application-{profile}.yml</code> → <code>application.yml</code>. Так что в Docker/Kubernetes настройки задаются через env, а в yml лежат дефолты.</p>

<h2>Чтение настроек в коде</h2>
<h3>@ConfigurationProperties — рекомендуемый способ</h3>
${java`
@@ AppProperties.java
@ConfigurationProperties(prefix = "app")
public record AppProperties(
    int maxTasksPerUser,      // app.max-tasks-per-user
    Duration tokenTtl         // "1h" автоматически превратится в Duration
) {}`}
${java`
@@ TodoApiApplication.java
@SpringBootApplication
@ConfigurationPropertiesScan          // найти все @ConfigurationProperties
public class TodoApiApplication { ... }

@Service
public class TaskService {
    private final AppProperties props;

    public TaskService(AppProperties props) { this.props = props; }  // внедряется как бин

    void checkLimit(int current) {
        if (current >= props.maxTasksPerUser()) throw new BusinessRuleException("limit");
    }
}`}
<p>Типобезопасно, с автодополнением в IDE, можно добавить валидацию через <code>@Validated</code> и <code>@Min</code>/<code>@NotBlank</code> на полях.</p>
<h3>@Value — для одиночных значений</h3>
${java`
@Service
public class Greeter {
    private final String appName;

    public Greeter(@Value("\${spring.application.name}") String appName) {
        this.appName = appName;
    }
}`}

<h2>Профили</h2>
<p><dfn>Profiles</dfn> (профили) — наборы настроек для разных окружений, аналог <code>.env.development</code> / <code>.env.production</code>.</p>
${tree`
src/main/resources/
├── application.yml          ← общие настройки
├── application-dev.yml      ← только для профиля dev
└── application-prod.yml     ← только для профиля prod`}
${bash`
# активировать профиль
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
java -jar app.jar --spring.profiles.active=prod
SPRING_PROFILES_ACTIVE=prod java -jar app.jar`}
<p>Настройки профиля переопределяют общие. Бины тоже можно включать по профилю: <code>@Profile("dev")</code> над классом — например, для заглушки отправки email в разработке.</p>

<h2>Код при старте</h2>
${java`
@Component
public class StartupLogger implements CommandLineRunner {
    private static final Logger log = LoggerFactory.getLogger(StartupLogger.class);
    private final AppProperties props;

    public StartupLogger(AppProperties props) { this.props = props; }

    @Override
    public void run(String... args) {
        log.info("Лимит задач на пользователя: {}", props.maxTasksPerUser());
    }
}`}
`,
      tasks: [
        {
          title: 'Запусти проект',
          text: `<p>Сгенерируй проект <code>todo-api</code> как описано выше, переименуй <code>application.properties</code> в <code>application.yml</code>, задай порт 8081 и свойства <code>app.max-tasks-per-user</code>, <code>app.token-ttl</code>. Создай <code>AppProperties</code> и <code>CommandLineRunner</code>, который печатает оба значения. Затем запусти с переменной окружения, переопределяющей лимит, и убедись, что значение поменялось.</p>`,
          solution: `${yaml`
            server:
              port: 8081
            app:
              max-tasks-per-user: 100
              token-ttl: 1h`}${bash`
            # PowerShell
            $env:APP_MAXTASKSPERUSER="5"; ./mvnw spring-boot:run

            # bash
            APP_MAXTASKSPERUSER=5 ./mvnw spring-boot:run`}<p>В логе должно появиться «Лимит задач на пользователя: 5». В IDEA переменные окружения задаются в Run Configuration → Environment variables.</p>`
        },
        {
          title: 'Профиль-заглушка',
          text: `<p>Создай интерфейс <code>MailSender</code>, реализацию <code>LoggingMailSender</code> (пишет письмо в лог) с <code>@Profile("dev")</code> и <code>SmtpMailSender</code> с <code>@Profile("!dev")</code> (пока тоже логирует, но с другим текстом). Проверь, что при разных профилях внедряется разная реализация.</p>`,
          solution: java`
            public interface MailSender {
                void send(String to, String subject);
            }

            @Component
            @Profile("dev")
            public class LoggingMailSender implements MailSender {
                private static final Logger log = LoggerFactory.getLogger(LoggingMailSender.class);
                public void send(String to, String subject) {
                    log.info("[DEV] письмо для {}: {}", to, subject);
                }
            }

            @Component
            @Profile("!dev")      // любой профиль, кроме dev
            public class SmtpMailSender implements MailSender {
                private static final Logger log = LoggerFactory.getLogger(SmtpMailSender.class);
                public void send(String to, String subject) {
                    log.info("[SMTP] отправка {}: {}", to, subject);
                }
            }`
        }
      ],
      quiz: [
        { q: 'Что делает <code>@ComponentScan</code> внутри <code>@SpringBootApplication</code>?', options: ['Сканирует весь classpath', 'Ищет бины в пакете главного класса и вложенных пакетах', 'Сканирует только src/main/resources', 'Ищет тесты'], answer: 1, explain: 'Поэтому классы вне корневого пакета не будут найдены.' },
        { q: 'Как переопределить <code>spring.datasource.url</code> через переменную окружения?', options: ['spring.datasource.url=...', 'SPRING_DATASOURCE_URL=...', 'DATASOURCE_URL=...', 'Никак'], answer: 1, explain: 'Relaxed binding: точки → _, верхний регистр.' },
        { q: 'Ты объявил свой бин ObjectMapper. Что сделает автоконфигурация?', options: ['Создаст второй', 'Упадёт с ошибкой', 'Не будет создавать свой — твой бин имеет приоритет', 'Перезапишет твой'], answer: 2, explain: 'Автоконфигурация срабатывает, только если подходящего бина ещё нет (@ConditionalOnMissingBean).' },
        { q: 'Аналог nodemon в Spring Boot:', options: ['Actuator', 'DevTools', 'Maven Wrapper', 'Profiles'], answer: 1, explain: 'spring-boot-devtools перезапускает контекст при изменении скомпилированных классов.' },
        { q: 'Какой способ чтения группы настроек рекомендуется?', options: ['System.getenv в каждом классе', '@Value на каждом поле', '@ConfigurationProperties в record', 'Чтение yml вручную'], answer: 2, explain: 'Типобезопасно, группирует настройки, легко тестировать.' }
      ]
    }
  ]
});
