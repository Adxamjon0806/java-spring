COURSE.addModule({
  id: 'm7',
  title: 'Работа с БД: JPA и Spring Data',
  description: 'PostgreSQL, сущности JPA/Hibernate вместо Prisma-моделей, репозитории Spring Data, связи, транзакции, проблема N+1 и миграции Flyway.',
  lessons: [
    {
      id: 'jpa-basics',
      title: 'JPA и Hibernate: сущности',
      minutes: 40,
      goals: [
        'понимать, как связаны JDBC, JPA, Hibernate и Spring Data',
        'подключить PostgreSQL к Spring Boot',
        'описывать таблицы как <code>@Entity</code>-классы',
        'понимать persistence context и dirty checking — главное отличие от Prisma'
      ],
      body: `
<h2>Слоёный пирог доступа к данным</h2>
${table(['Слой', 'Что это', 'Аналог в Node'], [
  ['<dfn>JDBC</dfn>', 'Низкоуровневый API для SQL: соединения, запросы, ResultSet', 'драйвер <code>pg</code>'],
  ['<dfn>JPA</dfn> (Jakarta Persistence API)', '<b>Спецификация</b> ORM: аннотации и интерфейсы, без реализации', '—'],
  ['<dfn>Hibernate</dfn>', 'Самая популярная <b>реализация</b> JPA', 'TypeORM'],
  ['<dfn>Spring Data JPA</dfn>', 'Репозитории поверх JPA: CRUD и запросы по имени метода', 'Prisma Client (по удобству)']
])}
<p>Ты будешь писать код в терминах JPA и Spring Data, а Hibernate будет работать под капотом. Существуют и более лёгкие альтернативы (<code>JdbcClient</code> из Spring, jOOQ, MyBatis), но JPA — стандарт, который встречается в большинстве вакансий.</p>

<h2>Подключаем PostgreSQL</h2>
${bash`
docker run -d --name todo-db -p 5432:5432 -e POSTGRES_DB=todo -e POSTGRES_USER=todo -e POSTGRES_PASSWORD=todo postgres:16-alpine`}
${xml`
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
<dependency>
  <groupId>org.postgresql</groupId>
  <artifactId>postgresql</artifactId>
  <scope>runtime</scope>
</dependency>`}
${yaml`
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/todo
    username: todo
    password: \${DB_PASSWORD:todo}
  jpa:
    hibernate:
      ddl-auto: update        # только для первых экспериментов! см. ниже
    open-in-view: false
    properties:
      hibernate:
        format_sql: true

logging:
  level:
    org.hibernate.SQL: debug  # показывать SQL-запросы в логе`}
<p>Spring Boot сам создаст пул соединений (<dfn>HikariCP</dfn>) и настроит Hibernate. <code>open-in-view: false</code> отключает антипаттерн, который включён по умолчанию (разберём в уроке про связи).</p>
${table(['ddl-auto', 'Что делает', 'Когда'], [
  ['<code>create-drop</code>', 'Создаёт схему при старте, удаляет при остановке', 'Тесты, эксперименты'],
  ['<code>update</code>', 'Пытается «догнать» схему до сущностей', 'Только эксперименты — никогда в проде'],
  ['<code>validate</code>', 'Проверяет, что схема соответствует сущностям, ничего не меняет', 'Прод вместе с Flyway'],
  ['<code>none</code>', 'Ничего не делает', 'Прод']
])}

<h2>Сущность</h2>
${cmp(text`
// schema.prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String
  role      Role     @default(USER)
  createdAt DateTime @default(now()) @map("created_at")

  @@map("users")
}

enum Role {
  USER
  ADMIN
}`, java`
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role = Role.USER;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected User() {}                  // нужен JPA

    public User(String email, String name) {
        this.email = email;
        this.name = name;
    }

    public Long getId() { return id; }
    public String getEmail() { return email; }
    public String getName() { return name; }
    public void rename(String name) { this.name = name; }
    public Role getRole() { return role; }
    public Instant getCreatedAt() { return createdAt; }
}`, 'Prisma', 'JPA')}
<ul>
  <li><code>@Entity</code> — класс отображается на таблицу; <code>@Table</code> — имя таблицы (по умолчанию — имя класса).</li>
  <li><code>@Id</code> + <code>@GeneratedValue(IDENTITY)</code> — первичный ключ с автоинкрементом в БД. Тип — <code>Long</code> (обёртка: у новой сущности <code>id == null</code>).</li>
  <li><code>@Column</code> — необязательна: по умолчанию все поля — колонки. Spring Boot переводит <code>createdAt</code> в <code>created_at</code> автоматически, но явное имя не повредит.</li>
  <li><code>@Enumerated(EnumType.STRING)</code> — хранить enum строкой. По умолчанию — порядковым номером, и добавление нового значения в середину ломает данные!</li>
  <li>Импорты аннотаций — из <code>jakarta.persistence.*</code> (в старом коде — <code>javax.persistence</code>).</li>
</ul>
${warn(`<p><b>Сущность — не record.</b> JPA требует конструктор без параметров, изменяемые поля и возможность создавать прокси-наследников. Поэтому сущности — обычные классы, а records используются для DTO.</p>`)}
${tip(`<p>Не делай сеттеры для всех полей. Методы с бизнес-смыслом (<code>rename</code>, <code>complete()</code>, <code>changeRole</code>) лучше выражают, что можно делать с объектом.</p>`)}

<h2>Persistence context и dirty checking</h2>
<p>Самое непривычное после Prisma. В Prisma каждый вызов — отдельный SQL-запрос, а объекты — просто данные. В JPA внутри транзакции работает <dfn>persistence context</dfn> (контекст персистентности) — «кэш первого уровня», который отслеживает все загруженные сущности.</p>
${cmp(js`
// Prisma: изменения — только через явный update
const user = await prisma.user.findUnique({ where: { id } });
await prisma.user.update({
  where: { id },
  data: { name: "Новое имя" },
});`, java`
// JPA: изменил объект — Hibernate сам сделает UPDATE
@Transactional
public void rename(long id, String newName) {
    User user = userRepository.findById(id).orElseThrow();
    user.rename(newName);
    // save() не нужен: при коммите транзакции Hibernate
    // сравнит объект со снимком и выполнит UPDATE
}`, 'Prisma', 'JPA')}
<p>Это называется <dfn>dirty checking</dfn> (отслеживание изменений). Сущность внутри транзакции находится в состоянии <dfn>managed</dfn>:</p>
${table(['Состояние', 'Что значит'], [
  ['<b>transient</b> (new)', 'Создан через <code>new</code>, Hibernate о нём не знает'],
  ['<b>managed</b>', 'Загружен или сохранён в текущей транзакции — изменения отслеживаются'],
  ['<b>detached</b>', 'Транзакция закончилась — изменения больше не отслеживаются'],
  ['<b>removed</b>', 'Помечен на удаление, DELETE выполнится при коммите']
])}
<p>Ещё одно следствие: повторный <code>findById(1)</code> в той же транзакции не идёт в БД — объект берётся из контекста. А SQL выполняется не сразу, а при коммите или перед запросом, которому нужны актуальные данные (<dfn>flush</dfn>).</p>
${info(`<p>Аннотация <code>@Transactional</code> (из <code>org.springframework.transaction.annotation</code>) открывает транзакцию на время вызова метода сервиса. Подробно — в уроке «Связи и транзакции». Пока запомни: <b>методы сервиса, которые меняют данные, помечай <code>@Transactional</code></b>.</p>`)}

<h2>equals/hashCode у сущностей</h2>
<p>Для сущностей не генерируй <code>equals</code>/<code>hashCode</code> по всем полям (как делает Lombok <code>@Data</code>) — это ломает работу с коллекциями и ленивой загрузкой. Простое правило: либо не переопределять вовсе, либо сравнивать только по <code>id</code>, когда он не null, а <code>hashCode</code> делать константным для класса:</p>
${java`
@Override
public boolean equals(Object o) {
    if (this == o) return true;
    if (!(o instanceof User other)) return false;
    return id != null && id.equals(other.getId());
}

@Override
public int hashCode() {
    return getClass().hashCode();
}`}
`,
      tasks: [
        {
          title: 'Сущность Task',
          text: `<p>Запусти PostgreSQL в Docker и подключи его к проекту <code>todo-api</code>. Создай сущность <code>Task</code>: <code>id</code>, <code>title</code> (not null, до 200 символов), <code>description</code> (тип <code>text</code>, может быть null), <code>status</code> (enum TODO/IN_PROGRESS/DONE, строкой), <code>dueDate</code> (<code>LocalDate</code>), <code>createdAt</code>. Добавь методы <code>start()</code> и <code>complete()</code>. Запусти приложение с <code>ddl-auto: update</code> и посмотри в логе сгенерированный <code>create table</code>.</p>`,
          solution: java`
            @Entity
            @Table(name = "tasks")
            public class Task {
                @Id
                @GeneratedValue(strategy = GenerationType.IDENTITY)
                private Long id;

                @Column(nullable = false, length = 200)
                private String title;

                @Column(columnDefinition = "text")
                private String description;

                @Enumerated(EnumType.STRING)
                @Column(nullable = false, length = 20)
                private TaskStatus status = TaskStatus.TODO;

                private LocalDate dueDate;

                @Column(nullable = false, updatable = false)
                private Instant createdAt = Instant.now();

                protected Task() {}

                public Task(String title, String description, LocalDate dueDate) {
                    this.title = title;
                    this.description = description;
                    this.dueDate = dueDate;
                }

                public void start() {
                    if (status != TaskStatus.TODO) throw new IllegalStateException("Task already started");
                    status = TaskStatus.IN_PROGRESS;
                }

                public void complete() {
                    status = TaskStatus.DONE;
                }

                // геттеры...
            }

            public enum TaskStatus { TODO, IN_PROGRESS, DONE }`
        }
      ],
      quiz: [
        { q: 'Что такое Hibernate по отношению к JPA?', options: ['Альтернатива JPA', 'Реализация спецификации JPA', 'Драйвер PostgreSQL', 'Часть Spring Boot'], answer: 1, explain: 'JPA — набор интерфейсов и аннотаций, Hibernate их реализует.' },
        { q: 'Внутри <code>@Transactional</code>-метода ты загрузил сущность и изменил поле. Что нужно, чтобы изменения сохранились?', options: ['Вызвать save()', 'Вызвать flush()', 'Ничего: dirty checking выполнит UPDATE при коммите', 'Вызвать update()'], answer: 2, explain: 'Managed-сущности отслеживаются, изменения записываются автоматически.' },
        { q: 'Почему enum лучше хранить с <code>EnumType.STRING</code>?', options: ['Так быстрее', 'При ORDINAL добавление значения в середину enum ломает существующие данные', 'ORDINAL не поддерживается PostgreSQL', 'Так требует Jackson'], answer: 1, explain: 'ORDINAL хранит порядковый номер, и он меняется при изменении порядка констант.' },
        { q: 'Какой <code>ddl-auto</code> уместен в продакшене вместе с Flyway?', options: ['create-drop', 'update', 'validate', 'create'], answer: 2, explain: 'Схемой управляют миграции, Hibernate только проверяет соответствие.' }
      ]
    },

    {
      id: 'spring-data',
      title: 'Spring Data: репозитории и запросы',
      minutes: 35,
      goals: [
        'создавать репозитории, наследуя <code>JpaRepository</code>',
        'писать derived queries — запросы по имени метода',
        'писать JPQL и нативные запросы через <code>@Query</code>',
        'делать пагинацию и сортировку',
        'использовать проекции для выборки части полей'
      ],
      body: `
<h2>Репозиторий за одну строку</h2>
${java`
public interface UserRepository extends JpaRepository<User, Long> {
}`}
<p>Это всё. Ты объявляешь <b>интерфейс</b>, а Spring Data при старте генерирует реализацию. Бесплатно получаешь:</p>
${table(['Метод', 'Prisma-аналог'], [
  ['<code>save(entity)</code>', '<code>create</code> / <code>update</code> (по наличию id)'],
  ['<code>saveAll(list)</code>', '<code>createMany</code>'],
  ['<code>findById(id)</code> → <code>Optional</code>', '<code>findUnique</code>'],
  ['<code>findAll()</code>, <code>findAll(Sort)</code>, <code>findAll(Pageable)</code>', '<code>findMany</code>'],
  ['<code>existsById(id)</code>', '—'],
  ['<code>count()</code>', '<code>count</code>'],
  ['<code>deleteById(id)</code>, <code>delete(entity)</code>', '<code>delete</code>']
])}

<h2>Derived queries — запросы по имени метода</h2>
<p>Spring Data разбирает имя метода и строит запрос. Звучит как магия, но это строгий синтаксис, и IDEA подсказывает его при наборе.</p>
${cmp(js`
prisma.user.findUnique({ where: { email } });

prisma.user.findMany({
  where: { role: "ADMIN", active: true },
});

prisma.user.findMany({
  where: { name: { contains: q, mode: "insensitive" } },
  orderBy: { createdAt: "desc" },
});

prisma.user.count({ where: { role } });`, java`
Optional<User> findByEmail(String email);

List<User> findByRoleAndActiveTrue(Role role);

List<User> findByNameContainingIgnoreCaseOrderByCreatedAtDesc(String q);

long countByRole(Role role);

boolean existsByEmail(String email);

List<Task> findByDueDateBeforeAndStatusNot(LocalDate date, TaskStatus status);

void deleteByCreatedAtBefore(Instant instant);`, 'Prisma', 'Spring Data')}
${table(['Ключевое слово', 'SQL'], [
  ['<code>findBy</code>, <code>countBy</code>, <code>existsBy</code>, <code>deleteBy</code>', 'тип запроса'],
  ['<code>And</code>, <code>Or</code>', 'AND, OR'],
  ['<code>Containing</code>, <code>StartingWith</code>, <code>IgnoreCase</code>', "LIKE '%x%', LIKE 'x%', UPPER()"],
  ['<code>GreaterThan</code>, <code>LessThanEqual</code>, <code>Between</code>, <code>Before</code>, <code>After</code>', '&gt;, &lt;=, BETWEEN'],
  ['<code>In</code>, <code>NotIn</code>, <code>IsNull</code>, <code>True</code>', 'IN, IS NULL, = true'],
  ['<code>OrderByXxxDesc</code>, <code>First</code>/<code>Top10</code>', 'ORDER BY, LIMIT']
])}
${tip(`<p>Если имя метода разрослось длиннее строки — переходи на <code>@Query</code>. Опечатка в имени поля даст ошибку при старте приложения, а не в рантайме — это приятно.</p>`)}

<h2>@Query: JPQL и SQL</h2>
<p><dfn>JPQL</dfn> (Jakarta Persistence Query Language) похож на SQL, но оперирует <b>сущностями и их полями</b>, а не таблицами и колонками:</p>
${java`
public interface TaskRepository extends JpaRepository<Task, Long> {

    @Query("""
        select t from Task t
        where t.status <> com.example.todo.task.TaskStatus.DONE
          and t.dueDate < :date
        order by t.dueDate
        """)
    List<Task> findOverdue(@Param("date") LocalDate date);

    // нативный SQL — когда нужны возможности конкретной БД
    @Query(value = "select * from tasks where title ilike concat('%', :q, '%')", nativeQuery = true)
    List<Task> searchNative(@Param("q") String q);

    // изменяющий запрос
    @Modifying
    @Query("update Task t set t.status = :status where t.id in :ids")
    int bulkUpdateStatus(@Param("ids") List<Long> ids, @Param("status") TaskStatus status);
}`}
${warn(`<p><code>@Modifying</code>-запросы выполняются в БД напрямую, <b>минуя persistence context</b>: уже загруженные в текущей транзакции сущности не узнают об изменениях. Вызывай такие методы из <code>@Transactional</code>-сервиса и не полагайся на ранее загруженные объекты.</p>`)}
<p>Параметры через <code>:name</code> — это prepared statements, SQL-инъекции исключены. Никогда не склеивай запрос из строк.</p>

<h2>Пагинация и сортировка</h2>
${java`
public interface TaskRepository extends JpaRepository<Task, Long> {
    Page<Task> findByStatus(TaskStatus status, Pageable pageable);
}

// в контроллере: GET /api/tasks?status=TODO&page=0&size=20&sort=dueDate,asc
@GetMapping
public PageResponse<TaskResponse> list(@RequestParam TaskStatus status,
                                       @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
    Page<Task> page = taskRepository.findByStatus(status, pageable);
    return PageResponse.from(page.map(TaskResponse::from));
}

// собственный DTO для страницы — стабильный JSON-контракт
public record PageResponse<T>(List<T> items, int page, int size, long totalItems, int totalPages) {
    public static <T> PageResponse<T> from(Page<T> p) {
        return new PageResponse<>(p.getContent(), p.getNumber(), p.getSize(),
                                  p.getTotalElements(), p.getTotalPages());
    }
}`}
<p>Spring сам соберёт <code>Pageable</code> из параметров <code>page</code>, <code>size</code>, <code>sort</code>. Нумерация страниц — с нуля. <code>Page</code> делает дополнительный <code>count</code>-запрос; если общее число не нужно (бесконечная лента), возвращай <code>Slice&lt;T&gt;</code>.</p>
${info(`<p>Возвращать <code>Page</code> напрямую из контроллера не стоит: его JSON-структура — внутренняя деталь Spring Data, и новые версии Spring предупреждают об этом в логе. Свой <code>PageResponse</code> — надёжнее.</p>`)}

<h2>Проекции</h2>
<p>Если нужна часть полей, не загружай всю сущность. Проекцию можно описать интерфейсом или record:</p>
${java`
public record TaskSummary(Long id, String title, TaskStatus status) {}

public interface TaskRepository extends JpaRepository<Task, Long> {
    List<TaskSummary> findByStatus(TaskStatus status);        // select id, title, status ...

    @Query("select new com.example.todo.task.TaskSummary(t.id, t.title, t.status) from Task t")
    List<TaskSummary> findAllSummaries();
}`}

<h2>Сервис с репозиторием</h2>
${java`
@Service
@Transactional(readOnly = true)               // по умолчанию — только чтение
public class TaskService {
    private final TaskRepository tasks;

    public TaskService(TaskRepository tasks) { this.tasks = tasks; }

    public Task get(long id) {
        return tasks.findById(id).orElseThrow(() -> new NotFoundException("Task " + id + " not found"));
    }

    @Transactional                            // этот метод пишет
    public Task create(String title, String description, LocalDate dueDate) {
        return tasks.save(new Task(title, description, dueDate));
    }

    @Transactional
    public Task complete(long id) {
        Task task = get(id);
        task.complete();                       // dirty checking сделает UPDATE
        return task;
    }

    @Transactional
    public void delete(long id) {
        if (!tasks.existsById(id)) throw new NotFoundException("Task " + id + " not found");
        tasks.deleteById(id);
    }
}`}
`,
      tasks: [
        {
          title: 'Task API на БД',
          text: `<p>Замени in-memory хранилище в <code>todo-api</code> на <code>TaskRepository extends JpaRepository&lt;Task, Long&gt;</code>. Эндпоинты: <code>GET /api/tasks?status=&amp;q=&amp;page=&amp;size=&amp;sort=</code> (фильтр по статусу и поиск по названию, оба необязательные), <code>GET /{id}</code>, <code>POST</code>, <code>POST /{id}/start</code>, <code>POST /{id}/complete</code>, <code>DELETE /{id}</code>. Ответы — DTO, ошибки — через GlobalExceptionHandler.</p>`,
          solution: `${java`
            public interface TaskRepository extends JpaRepository<Task, Long> {
                Page<Task> findByStatus(TaskStatus status, Pageable pageable);
                Page<Task> findByTitleContainingIgnoreCase(String q, Pageable pageable);
                Page<Task> findByStatusAndTitleContainingIgnoreCase(TaskStatus status, String q, Pageable pageable);
            }

            // TaskService
            public Page<Task> search(TaskStatus status, String q, Pageable pageable) {
                boolean hasQ = q != null && !q.isBlank();
                if (status != null && hasQ) return tasks.findByStatusAndTitleContainingIgnoreCase(status, q, pageable);
                if (status != null) return tasks.findByStatus(status, pageable);
                if (hasQ) return tasks.findByTitleContainingIgnoreCase(q, pageable);
                return tasks.findAll(pageable);
            }

            // TaskController
            @GetMapping
            public PageResponse<TaskResponse> list(@RequestParam(required = false) TaskStatus status,
                                                   @RequestParam(required = false) String q,
                                                   @PageableDefault(size = 20, sort = "createdAt",
                                                                    direction = Sort.Direction.DESC) Pageable pageable) {
                return PageResponse.from(taskService.search(status, q, pageable).map(TaskResponse::from));
            }

            @PostMapping("/{id}/complete")
            public TaskResponse complete(@PathVariable long id) {
                return TaskResponse.from(taskService.complete(id));
            }`}<p>Комбинации фильтров через if — нормальный старт. Когда фильтров станет много, переходи на <dfn>Specifications</dfn> (<code>JpaSpecificationExecutor</code>) или Querydsl — это аналог динамического <code>where</code> в Prisma.</p>`
        }
      ],
      quiz: [
        { q: 'Кто пишет реализацию <code>interface UserRepository extends JpaRepository&lt;User, Long&gt;</code>?', options: ['Ты', 'Spring Data генерирует её при старте', 'Hibernate при компиляции', 'Maven-плагин'], answer: 1, explain: 'Spring Data создаёт прокси-реализацию интерфейса.' },
        { q: 'Что вернёт <code>findById</code>?', options: ['User или null', 'Optional&lt;User&gt;', 'List&lt;User&gt;', 'Исключение, если нет'], answer: 1, explain: 'Optional — явный сигнал «может не найтись».' },
        { q: 'Чем JPQL отличается от SQL?', options: ['Ничем', 'Оперирует сущностями и их полями, а не таблицами и колонками', 'Работает только с PostgreSQL', 'Не поддерживает where'], answer: 1, explain: 'select t from Task t where t.owner.id = :id — это имена классов и полей.' },
        { q: 'Как получить вторую страницу по 10 элементов?', options: ['?page=2&size=10', '?page=1&size=10', '?offset=10', '?p=2'], answer: 1, explain: 'Нумерация страниц в Spring Data — с нуля.' }
      ]
    },

    {
      id: 'relations-transactions',
      title: 'Связи, транзакции, N+1 и миграции',
      minutes: 50,
      goals: [
        'описывать связи <code>@ManyToOne</code> и <code>@OneToMany</code>',
        'понимать ленивую загрузку и решать проблему N+1',
        'правильно использовать <code>@Transactional</code> и знать его ловушки',
        'управлять схемой БД через миграции Flyway'
      ],
      body: `
<h2>Связи между сущностями</h2>
<p>Модель: у проекта много задач, у задачи — один проект.</p>
${java`
@Entity
@Table(name = "projects")
public class Project {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Task> tasks = new ArrayList<>();

    protected Project() {}
    public Project(String name) { this.name = name; }

    // helper-методы держат обе стороны связи в согласованном состоянии
    public void addTask(Task task) {
        tasks.add(task);
        task.setProject(this);
    }

    public void removeTask(Task task) {
        tasks.remove(task);
        task.setProject(null);
    }
    // геттеры ...
}

@Entity
@Table(name = "tasks")
public class Task {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id")               // внешний ключ в таблице tasks
    private Project project;

    void setProject(Project project) { this.project = project; }
    // ...
}`}
<ul>
  <li><b>Владелец связи</b> — сторона с внешним ключом: <code>@ManyToOne</code> в <code>Task</code>. Именно её значение пишется в БД.</li>
  <li><code>mappedBy = "project"</code> на стороне <code>@OneToMany</code> говорит: «эта связь описана полем <code>project</code> в <code>Task</code>», дополнительной таблицы не нужно.</li>
  <li><code>cascade = ALL</code> — сохранение/удаление проекта распространяется на его задачи; <code>orphanRemoval</code> — задача, удалённая из списка, удаляется из БД.</li>
  <li>Для many-to-many есть <code>@ManyToMany</code>, но на практике чаще делают явную промежуточную сущность — у связи почти всегда появляются свои поля (дата, роль).</li>
</ul>
${cmp(text`
// Prisma
model Project {
  id    Int    @id @default(autoincrement())
  name  String
  tasks Task[]
}

model Task {
  id        Int     @id @default(autoincrement())
  project   Project @relation(fields: [projectId], references: [id])
  projectId Int
}`, java`
// JPA: вместо поля projectId — ссылка на объект
Task task = taskRepository.findById(1L).orElseThrow();
Project p = task.getProject();       // объект, а не id
p.getName();                         // здесь может уйти SQL-запрос (lazy)

// а если нужен только id:
Long projectId = task.getProject().getId();  // без запроса: id известен прокси`, 'Prisma', 'JPA')}

<h2>Ленивая загрузка</h2>
<p><dfn>Lazy loading</dfn> (ленивая загрузка): связанный объект загружается не сразу, а при первом обращении. Вместо настоящего <code>Project</code> Hibernate подставляет прокси, который сходит в БД, когда ты вызовешь его метод.</p>
${table(['Связь', 'Fetch по умолчанию', 'Рекомендация'], [
  ['<code>@ManyToOne</code>, <code>@OneToOne</code>', 'EAGER (загружать сразу)', 'Всегда ставь <code>fetch = FetchType.LAZY</code>'],
  ['<code>@OneToMany</code>, <code>@ManyToMany</code>', 'LAZY', 'Оставить LAZY']
])}
${warn(`<p><dfn>LazyInitializationException</dfn> — обращение к ленивой связи <b>после закрытия транзакции</b>, когда сессии с БД уже нет. Типичный случай: сервис вернул сущность, а контроллер (или Jackson при сериализации) трогает <code>task.getProject().getName()</code>. Решение: маппить в DTO <b>внутри</b> транзакционного метода сервиса или загружать связи заранее (см. ниже).</p>
<p>Настройка <code>spring.jpa.open-in-view=true</code> (по умолчанию!) маскирует проблему, держа сессию открытой до конца HTTP-запроса — ценой соединения с БД на весь запрос и скрытых запросов из контроллера. Мы её выключили.</p>`)}

<h2>Проблема N+1</h2>
<p>Классика ORM, которая встречается и с Prisma (если делать запросы в цикле), но в JPA она особенно коварна, потому что запросы скрыты за геттерами:</p>
${java`
List<Project> projects = projectRepository.findAll();          // 1 запрос
for (Project p : projects) {
    System.out.println(p.getName() + ": " + p.getTasks().size()); // +1 запрос на КАЖДЫЙ проект
}
// 100 проектов = 101 запрос`}
<p>Решения — загрузить связи одним запросом:</p>
${java`
public interface ProjectRepository extends JpaRepository<Project, Long> {

    // 1. JOIN FETCH в JPQL — аналог include в Prisma
    @Query("select distinct p from Project p left join fetch p.tasks where p.id = :id")
    Optional<Project> findWithTasks(@Param("id") long id);

    // 2. EntityGraph — то же самое декларативно
    @EntityGraph(attributePaths = "tasks")
    List<Project> findByNameContaining(String q);
}

// для ManyToOne-стороны:
public interface TaskRepository extends JpaRepository<Task, Long> {
    @EntityGraph(attributePaths = "project")
    List<Task> findByStatus(TaskStatus status);   // задачи сразу с проектами
}`}
${tip(`<p>Включи лог SQL (<code>logging.level.org.hibernate.SQL=debug</code>) на время разработки и смотри, сколько запросов делает каждый эндпоинт. Видишь одинаковые запросы пачкой — это N+1.</p>`)}
${warn(`<p><code>JOIN FETCH</code> коллекции вместе с пагинацией (<code>Pageable</code>) Hibernate выполняет в памяти, загружая всё — в логе будет предупреждение <code>HHH90003004</code>. Для страниц сначала выбирай id страницей, затем загружай связи вторым запросом.</p>`)}

<h2>@Transactional подробно</h2>
<p><dfn>Транзакция</dfn> — группа операций, которые выполняются целиком или не выполняются вовсе. В Node ты бы написал <code>prisma.$transaction(async (tx) =&gt; { ... })</code>. В Spring — аннотация на методе сервиса:</p>
${cmp(js`
await prisma.$transaction(async (tx) => {
  await tx.account.update({
    where: { id: from },
    data: { balance: { decrement: amount } } });
  await tx.account.update({
    where: { id: to },
    data: { balance: { increment: amount } } });
});`, java`
@Transactional
public void transfer(long fromId, long toId, BigDecimal amount) {
    Account from = accounts.findById(fromId).orElseThrow();
    Account to = accounts.findById(toId).orElseThrow();
    from.withdraw(amount);   // бросит исключение -> откат всего
    to.deposit(amount);
}   // коммит при успешном выходе из метода`, 'Prisma', 'Spring')}
<h3>Правила и ловушки</h3>
<ul>
  <li><b>Откат по умолчанию — только на unchecked-исключения</b> (<code>RuntimeException</code>, <code>Error</code>). На checked-исключение транзакция закоммитится! Нужно иначе — <code>@Transactional(rollbackFor = Exception.class)</code>. Ещё одна причина делать свои исключения unchecked.</li>
  <li><b><code>readOnly = true</code></b> для методов чтения — Hibernate не делает dirty checking, это быстрее.</li>
  <li><b>Self-invocation:</b> <code>@Transactional</code> работает через прокси (урок про IoC). Вызов <code>this.otherMethod()</code> из того же класса идёт мимо прокси, и аннотация на <code>otherMethod</code> игнорируется.</li>
  <li>Аннотация работает только на <b>public</b>-методах бинов, вызванных извне.</li>
  <li>Ставь <code>@Transactional</code> на <b>сервисы</b>, не на контроллеры. Методы <code>JpaRepository</code> уже транзакционны сами по себе.</li>
  <li>Не делай долгих внешних вызовов (HTTP, отправка почты) внутри транзакции — соединение с БД всё это время занято.</li>
</ul>
${java`
@Service
public class OrderService {
    public void placeAll(List<OrderRequest> requests) {
        for (var r : requests) {
            place(r);              // ❌ вызов через this — транзакции НЕ будет
        }
    }

    @Transactional
    public void place(OrderRequest r) { ... }
}
// Решение: пометить @Transactional сам placeAll, либо вынести place в другой бин.`}
<p><dfn>Propagation</dfn> (распространение) определяет поведение при вложенных вызовах. По умолчанию <code>REQUIRED</code>: присоединиться к текущей транзакции или создать новую. <code>REQUIRES_NEW</code> — всегда отдельная транзакция (например, запись в журнал аудита, которая должна сохраниться даже при откате основной).</p>

<h2>Миграции: Flyway</h2>
<p>В продакшене схемой управляют не через <code>ddl-auto</code>, а через версионированные SQL-миграции — как <code>prisma migrate</code> или knex migrations. Стандарт в Spring — <dfn>Flyway</dfn>.</p>
${xml`
<dependency>
  <groupId>org.flywaydb</groupId>
  <artifactId>flyway-core</artifactId>
</dependency>
<dependency>
  <groupId>org.flywaydb</groupId>
  <artifactId>flyway-database-postgresql</artifactId>  <!-- нужен для PostgreSQL во Flyway 10+ -->
</dependency>`}
${tree`
src/main/resources/db/migration/
├── V1__create_projects_and_tasks.sql
├── V2__add_users.sql
└── V3__add_task_priority.sql`}
${sql`
@@ V1__create_projects_and_tasks.sql
create table projects (
    id         bigint generated always as identity primary key,
    name       varchar(200) not null,
    created_at timestamptz  not null default now()
);

create table tasks (
    id          bigint generated always as identity primary key,
    project_id  bigint       not null references projects (id) on delete cascade,
    title       varchar(200) not null,
    description text,
    status      varchar(20)  not null default 'TODO',
    due_date    date,
    created_at  timestamptz  not null default now()
);

create index idx_tasks_project on tasks (project_id);`}
${yaml`
spring:
  jpa:
    hibernate:
      ddl-auto: validate     # Hibernate только сверяет схему с сущностями`}
<ul>
  <li>Имя файла: <code>V&lt;версия&gt;__&lt;описание&gt;.sql</code> (два подчёркивания).</li>
  <li>Flyway применяет новые миграции <b>при старте приложения</b> и записывает историю в таблицу <code>flyway_schema_history</code>.</li>
  <li><b>Применённую миграцию нельзя менять</b> — Flyway проверяет контрольные суммы. Ошибка — исправляй новой миграцией.</li>
</ul>
`,
      tasks: [
        {
          title: 'Проекты и задачи',
          text: `<p>Удали <code>ddl-auto: update</code>, пересоздай БД и опиши схему миграциями Flyway. Добавь сущность <code>Project</code> со связью на задачи. Эндпоинты: <code>POST /api/projects</code>, <code>GET /api/projects/{id}</code> (с задачами, <b>одним SQL-запросом</b> — проверь по логу), <code>POST /api/projects/{id}/tasks</code>. Ответы — DTO, маппинг внутри транзакции.</p>`,
          solution: java`
            public interface ProjectRepository extends JpaRepository<Project, Long> {
                @Query("select p from Project p left join fetch p.tasks where p.id = :id")
                Optional<Project> findWithTasks(@Param("id") long id);
            }

            public record TaskResponse(long id, String title, TaskStatus status) {
                static TaskResponse from(Task t) { return new TaskResponse(t.getId(), t.getTitle(), t.getStatus()); }
            }

            public record ProjectResponse(long id, String name, List<TaskResponse> tasks) {
                static ProjectResponse from(Project p) {
                    return new ProjectResponse(p.getId(), p.getName(),
                        p.getTasks().stream().map(TaskResponse::from).toList());
                }
            }

            @Service
            @Transactional(readOnly = true)
            public class ProjectService {
                private final ProjectRepository projects;

                public ProjectService(ProjectRepository projects) { this.projects = projects; }

                @Transactional
                public ProjectResponse create(String name) {
                    return ProjectResponse.from(projects.save(new Project(name)));
                }

                public ProjectResponse get(long id) {
                    Project p = projects.findWithTasks(id)
                        .orElseThrow(() -> new NotFoundException("Project " + id + " not found"));
                    return ProjectResponse.from(p);          // маппинг ВНУТРИ транзакции
                }

                @Transactional
                public TaskResponse addTask(long projectId, String title) {
                    Project p = projects.findById(projectId)
                        .orElseThrow(() -> new NotFoundException("Project " + projectId + " not found"));
                    Task task = new Task(title, null, null);
                    p.addTask(task);
                    projects.flush();                        // чтобы получить id задачи сразу
                    return TaskResponse.from(task);
                }
            }`
        },
        {
          title: 'Найди проблему',
          text: `<p>Почему этот код не откатывает транзакцию при ошибке оплаты, и как это исправить двумя способами?</p>${java`
            @Transactional
            public void checkout(long orderId) throws PaymentException {   // PaymentException extends Exception
                Order order = orders.findById(orderId).orElseThrow();
                order.markPaid();
                paymentGateway.charge(order);   // бросает PaymentException
            }`}`,
          solution: `<p><code>PaymentException</code> — checked-исключение, а <code>@Transactional</code> по умолчанию откатывает только при unchecked. Заказ останется помеченным как оплаченный.</p><ol><li><code>@Transactional(rollbackFor = PaymentException.class)</code> (или <code>Exception.class</code>);</li><li>сделать <code>PaymentException extends RuntimeException</code>.</li></ol><p>И третье, архитектурное замечание: внешний платёжный вызов лучше вынести из транзакции БД — сначала списать деньги, затем в короткой транзакции пометить заказ.</p>`
        }
      ],
      quiz: [
        { q: 'Какая сторона связи — владелец (пишет внешний ключ)?', options: ['@OneToMany с mappedBy', '@ManyToOne', 'Обе', 'Та, что создана первой'], answer: 1, explain: 'Внешний ключ лежит в таблице «многих», это @ManyToOne.' },
        { q: 'Что такое N+1?', options: ['Ошибка нумерации страниц', 'Один запрос за списком + по запросу на каждый элемент за связанными данными', 'Лишний столбец в таблице', 'Ограничение пула соединений'], answer: 1, explain: 'Лечится JOIN FETCH или @EntityGraph.' },
        { q: 'Метод с <code>@Transactional</code> бросил <code>IOException</code> (checked). Что с транзакцией?', options: ['Откатится', 'Закоммитится', 'Зависнет', 'Зависит от БД'], answer: 1, explain: 'По умолчанию откат только на RuntimeException и Error.' },
        { q: 'Метод A бина вызывает свой же метод B с @Transactional через this. Будет ли транзакция?', options: ['Да', 'Нет: вызов идёт мимо прокси', 'Только если B public', 'Только с REQUIRES_NEW'], answer: 1, explain: 'Self-invocation — классическая ловушка прокси Spring.' },
        { q: 'Можно ли отредактировать уже применённую миграцию V1?', options: ['Да', 'Нет — Flyway проверяет контрольные суммы, нужна новая миграция', 'Только в dev', 'Только через ddl-auto'], answer: 1, explain: 'Изменения схемы — только новыми версиями.' }
      ]
    }
  ]
});
