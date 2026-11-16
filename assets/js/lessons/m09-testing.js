COURSE.addModule({
  id: 'm9',
  title: 'Тестирование Spring-приложений',
  description: 'Срезы контекста (@WebMvcTest, @DataJpaTest), MockMvc вместо Supertest, интеграционные тесты с настоящей БД через Testcontainers, тесты с безопасностью.',
  lessons: [
    {
      id: 'spring-testing',
      title: 'Тесты контроллеров, репозиториев и интеграционные',
      minutes: 50,
      goals: [
        'выбирать подходящий вид теста: юнит, срез, интеграционный',
        'тестировать контроллеры через <code>@WebMvcTest</code> и MockMvc',
        'тестировать репозитории на настоящем PostgreSQL через Testcontainers',
        'писать сквозные тесты <code>@SpringBootTest</code>',
        'тестировать эндпоинты, защищённые Spring Security'
      ],
      body: `
<h2>Пирамида тестов в Spring</h2>
${table(['Вид', 'Что поднимается', 'Скорость', 'Для чего'], [
  ['Юнит-тест (JUnit + Mockito)', 'Ничего, только <code>new</code>', '⚡ миллисекунды', 'Бизнес-логика сервисов, доменные объекты'],
  ['<code>@WebMvcTest</code>', 'Только веб-слой: контроллеры, advice, фильтры, Security', '🚀 ~1–2 c', 'HTTP-контракт: маршруты, валидация, статусы, JSON'],
  ['<code>@DataJpaTest</code>', 'Только JPA: сущности, репозитории, БД', '🚀 секунды', 'Запросы, маппинг сущностей, миграции'],
  ['<code>@SpringBootTest</code>', 'Всё приложение', '🐢 секунды–десятки секунд', 'Сквозные сценарии']
])}
<p>Такие тесты-«срезы» (<dfn>test slices</dfn>) поднимают только часть контекста — это компромисс между скоростью юнит-тестов и реалистичностью интеграционных. Всё нужное — в <code>spring-boot-starter-test</code> (JUnit 5, AssertJ, Mockito, MockMvc, JsonPath).</p>
${node(`<p>MockMvc — это аналог <b>Supertest</b>: выполняет HTTP-запросы к приложению без настоящего сетевого сервера.</p>`)}

<h2>@WebMvcTest + MockMvc</h2>
${cmp(js`
jest.mock("../services/taskService");

test("GET /api/tasks/1", async () => {
  taskService.get.mockResolvedValue(
    { id: 1, title: "Купить молоко", status: "TODO" });

  const res = await request(app).get("/api/tasks/1");

  expect(res.status).toBe(200);
  expect(res.body.title).toBe("Купить молоко");
});`, java`
@WebMvcTest(TaskController.class)
class TaskControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean TaskService taskService;   // мок вместо настоящего бина

    @Test
    void returnsTask() throws Exception {
        when(taskService.get(1L)).thenReturn(
            new TaskResponse(1L, "Купить молоко", TaskStatus.TODO));

        mvc.perform(get("/api/tasks/1"))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.title").value("Купить молоко"));
    }
}`, 'Jest + Supertest', 'Spring')}
<ul>
  <li><code>@MockitoBean</code> (Spring Boot 3.4+) кладёт в контекст мок вместо реального бина. В более старом коде ты увидишь <code>@MockBean</code> — то же самое, теперь устаревшее.</li>
  <li>Статические импорты: <code>MockMvcRequestBuilders.*</code> (get, post…), <code>MockMvcResultMatchers.*</code> (status, jsonPath…).</li>
  <li><dfn>JsonPath</dfn> — язык путей в JSON: <code>$.title</code>, <code>$.items[0].id</code>, <code>$.items.length()</code>.</li>
</ul>
${java`
@Test
void createsTask() throws Exception {
    when(taskService.create(any())).thenReturn(new TaskResponse(5L, "Новая", TaskStatus.TODO));

    mvc.perform(post("/api/tasks")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                { "title": "Новая" }
                """))
       .andExpect(status().isCreated())
       .andExpect(jsonPath("$.id").value(5));
}

@Test
void rejectsBlankTitle() throws Exception {
    mvc.perform(post("/api/tasks")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                { "title": "" }
                """))
       .andExpect(status().isBadRequest())
       .andExpect(jsonPath("$.errors.title").exists());

    verifyNoInteractions(taskService);           // до сервиса не дошло
}

@Test
void returns404WhenMissing() throws Exception {
    when(taskService.get(99L)).thenThrow(new NotFoundException("Task 99 not found"));

    mvc.perform(get("/api/tasks/99"))
       .andExpect(status().isNotFound())
       .andExpect(jsonPath("$.detail").value("Task 99 not found"));
}`}

<h2>Тесты с Spring Security</h2>
<p><code>@WebMvcTest</code> подключает и фильтры безопасности, поэтому запрос без аутентификации получит 401. Нужна зависимость <code>spring-security-test</code> (scope test):</p>
${java`
@WebMvcTest(TaskController.class)
@Import(SecurityConfig.class)                  // твоя конфигурация правил доступа
class SecuredTaskControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean TaskService taskService;

    @Test
    void anonymousGets401() throws Exception {
        mvc.perform(get("/api/tasks")).andExpect(status().isUnauthorized());
    }

    @Test
    void userWithJwtGets200() throws Exception {
        when(taskService.myTasks(eq("anya@example.com"), any())).thenReturn(Page.empty());

        mvc.perform(get("/api/tasks")
                .with(jwt().jwt(j -> j.subject("anya@example.com"))
                           .authorities(new SimpleGrantedAuthority("ROLE_USER"))))
           .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "USER")              // альтернатива для не-JWT случаев
    void userCannotOpenAdminArea() throws Exception {
        mvc.perform(get("/api/admin/tasks")).andExpect(status().isForbidden());
    }
}`}
<p><code>jwt()</code> — из <code>SecurityMockMvcRequestPostProcessors</code>: подставляет готовый аутентифицированный JWT, не требуя настоящей подписи.</p>

<h2>@DataJpaTest и Testcontainers</h2>
<p>Тестировать запросы к БД на H2 (встроенной in-memory БД) — соблазнительно, но рискованно: диалект SQL отличается от PostgreSQL. Современный стандарт — <dfn>Testcontainers</dfn>: библиотека поднимает настоящий PostgreSQL в Docker на время тестов.</p>
${xml`
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-testcontainers</artifactId>
  <scope>test</scope>
</dependency>
<dependency>
  <groupId>org.testcontainers</groupId>
  <artifactId>junit-jupiter</artifactId>
  <scope>test</scope>
</dependency>
<dependency>
  <groupId>org.testcontainers</groupId>
  <artifactId>postgresql</artifactId>
  <scope>test</scope>
</dependency>`}
${java`
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)  // не подменять на H2
@Testcontainers
class TaskRepositoryTest {

    @Container
    @ServiceConnection            // Boot сам возьмёт url/логин/пароль из контейнера
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired TaskRepository tasks;
    @Autowired TestEntityManager em;

    @Test
    void findsTasksOfOwner() {
        User anya = em.persist(new User("anya@example.com", "hash", Role.USER));
        User bob = em.persist(new User("bob@example.com", "hash", Role.USER));
        em.persist(new Task(anya, "Задача Ани", null, null));
        em.persist(new Task(bob, "Задача Боба", null, null));
        em.flush();

        Page<Task> page = tasks.findByOwnerEmail("anya@example.com", PageRequest.of(0, 10));

        assertThat(page.getContent()).extracting(Task::getTitle).containsExactly("Задача Ани");
    }
}`}
<ul>
  <li>Миграции Flyway применяются к контейнеру автоматически — заодно проверяются и они.</li>
  <li>Каждый тест <code>@DataJpaTest</code> выполняется в транзакции, которая <b>откатывается</b> в конце — тесты не мешают друг другу.</li>
  <li>Нужен запущенный Docker (Docker Desktop на Windows).</li>
</ul>
${info(`<p>В Testcontainers 2.x изменились имена модулей и пакетов (например, класс PostgreSQL-контейнера переехал в пакет <code>org.testcontainers.postgresql</code> и стал не-generic). Если используешь Spring Boot 4 — бери импорты, которые предлагает IDE; идея теста та же.</p>`)}

<h2>@SpringBootTest — сквозной тест</h2>
<p>Поднимает всё приложение. Удобно вынести контейнер в общую конфигурацию, чтобы все интеграционные тесты переиспользовали её:</p>
${java`
@@ TestcontainersConfig.java (src/test/java)
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfig {
    @Bean
    @ServiceConnection
    PostgreSQLContainer<?> postgres() {
        return new PostgreSQLContainer<>("postgres:16-alpine");
    }
}`}
${java`
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class TaskFlowIntegrationTest {
    @Autowired MockMvc mvc;

    @Test
    void registerLoginAndCreateTask() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email": "it@example.com", "password": "secret123"}
                    """))
           .andExpect(status().isCreated());

        String body = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email": "it@example.com", "password": "secret123"}
                    """))
           .andExpect(status().isOk())
           .andReturn().getResponse().getContentAsString();
        String token = JsonPath.read(body, "$.accessToken");

        mvc.perform(post("/api/tasks").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"title": "Из интеграционного теста"}
                    """))
           .andExpect(status().isCreated());

        mvc.perform(get("/api/tasks").header("Authorization", "Bearer " + token))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.items[0].title").value("Из интеграционного теста"));
    }
}`}
${tip(`<p>Тот же <code>TestcontainersConfig</code> можно использовать для <b>локального запуска</b>: создай в <code>src/test/java</code> класс с <code>main</code>, вызывающий <code>SpringApplication.from(TodoApiApplication::main).with(TestcontainersConfig.class).run(args)</code> — приложение стартует с автоматически поднятым PostgreSQL. Никакого ручного <code>docker run</code>.</p>`)}
${warn(`<p>Spring кэширует контекст между тестами с одинаковой конфигурацией. Каждая уникальная комбинация <code>@MockitoBean</code>/<code>@Import</code>/профилей создаёт новый контекст — тесты замедляются. Старайся держать конфигурации интеграционных тестов одинаковыми (например, общий базовый класс).</p>`)}
`,
      tasks: [
        {
          title: 'Покрой todo-api тестами',
          text: `<p>Напиши для своего проекта: (1) юнит-тест <code>TaskService</code> с Mockito — создание, 404 на чужую задачу; (2) <code>@WebMvcTest</code> для <code>TaskController</code> — 201 при создании, 400 при пустом названии, 401 без токена; (3) <code>@DataJpaTest</code> с Testcontainers для запроса задач по владельцу; (4) один <code>@SpringBootTest</code> со сценарием регистрация → логин → создание → список. Запусти всё через <code>./mvnw test</code>.</p>`,
          solution: `<p>Ориентируйся на примеры урока — они написаны под тот же проект. Чек-лист самопроверки:</p><ul><li>юнит-тесты не используют аннотации Spring и выполняются за миллисекунды;</li><li>в <code>@WebMvcTest</code> сервис замокан через <code>@MockitoBean</code>, а для защищённых эндпоинтов используется <code>.with(jwt())</code>;</li><li>репозиторный тест работает с PostgreSQL в контейнере, а не с H2;</li><li>сквозной тест не мокает ничего и проходит путь через Security, валидацию, сервис и БД;</li><li><code>./mvnw test</code> проходит «с нуля» на чистой машине, где запущен только Docker.</li></ul>`
        }
      ],
      quiz: [
        { q: 'Что поднимает <code>@WebMvcTest(TaskController.class)</code>?', options: ['Всё приложение', 'Только веб-слой: контроллер, advice, фильтры, конвертеры', 'Только БД', 'Ничего'], answer: 1, explain: 'Сервисы и репозитории не создаются — их нужно замокать.' },
        { q: 'Аналог Supertest в Spring:', options: ['RestClient', 'MockMvc', 'Mockito', 'JsonPath'], answer: 1, explain: 'MockMvc выполняет запросы к DispatcherServlet без сети.' },
        { q: 'Почему для тестов репозиториев предпочитают Testcontainers, а не H2?', options: ['H2 платная', 'Тест идёт на той же СУБД, что и в проде, — без различий диалектов', 'H2 не поддерживает JPA', 'Testcontainers быстрее'], answer: 1, explain: 'Нативные запросы, типы и миграции проверяются на настоящем PostgreSQL.' },
        { q: 'Что делает <code>@ServiceConnection</code>?', options: ['Подключает внешний сервис по HTTP', 'Автоматически настраивает подключение Spring Boot к контейнеру (url, логин, пароль)', 'Создаёт соединение с Docker Hub', 'Включает транзакции'], answer: 1, explain: 'Не нужно вручную прописывать spring.datasource.* для тестов.' }
      ]
    }
  ]
});
